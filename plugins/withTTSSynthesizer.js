const {
  withDangerousMod,
  withMainApplication,
  withAndroidManifest,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ─── Kotlin source templates ──────────────────────────────────────────────────

function buildModuleKt(packageName) {
  return `package ${packageName}

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.util.Locale
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class TTSSynthesizerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "TTSSynthesizer"

  // ── TTS synthesis engine ──────────────────────────────────────────────────

  private var tts: TextToSpeech? = null
  private var ttsReady = false
  private var currentVoice: Voice? = null
  private val synthExecutor = Executors.newSingleThreadExecutor()
  private val pendingUtterances = ConcurrentHashMap<String, UtteranceState>()

  private data class UtteranceState(val latch: CountDownLatch, var error: String? = null)

  // ── Service binding ───────────────────────────────────────────────────────

  private var boundService: TTSSynthesizerService? = null
  private var isServiceBound = false

  private val serviceConnection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
      boundService = (binder as TTSSynthesizerService.LocalBinder).getService()
      isServiceBound = true
      boundService?.onPlaybackFinished = { emitEvent("onTTSPlaybackFinished", null) }
      boundService?.onPlaybackError = { msg ->
        val params = Arguments.createMap().apply { putString("error", msg) }
        emitEvent("onTTSPlaybackError", params)
      }
    }
    override fun onServiceDisconnected(name: ComponentName?) {
      boundService = null
      isServiceBound = false
    }
  }

  private fun emitEvent(name: String, params: WritableMap?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(name, params)
  }

  // ── Foreground service ────────────────────────────────────────────────────

  @ReactMethod
  fun startForegroundService(promise: Promise) {
    // If already bound, resolve immediately.
    if (isServiceBound && boundService != null) { promise.resolve(null); return }

    try {
      val intent = Intent(reactContext, TTSSynthesizerService::class.java).apply {
        action = TTSSynthesizerService.ACTION_START
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.startForegroundService(intent)
      } else {
        reactContext.startService(intent)
      }

      // Wrap the async bind in a one-shot connection that resolves the promise
      // only after onServiceConnected fires, then hands off to the persistent
      // serviceConnection for ongoing play/pause calls.
      val bootstrapConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
          // Transition to the persistent connection so callbacks keep working.
          reactContext.unbindService(this)
          reactContext.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
          promise.resolve(null)
        }
        override fun onServiceDisconnected(name: ComponentName?) {
          promise.reject("FG_SERVICE_ERROR", "Service disconnected before binding completed")
        }
      }
      reactContext.bindService(intent, bootstrapConnection, Context.BIND_AUTO_CREATE)
    } catch (e: Exception) {
      promise.reject("FG_SERVICE_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun stopForegroundService(promise: Promise) {
    try {
      if (isServiceBound) {
        reactContext.unbindService(serviceConnection)
        isServiceBound = false
        boundService = null
      }
      val intent = Intent(reactContext, TTSSynthesizerService::class.java).apply {
        action = TTSSynthesizerService.ACTION_STOP
      }
      reactContext.startService(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.resolve(null)
    }
  }

  // ── Native playback ───────────────────────────────────────────────────────

  @ReactMethod
  fun play(uri: String, promise: Promise) {
    val svc = boundService
    if (svc == null) {
      promise.reject("NOT_BOUND", "Service not bound — call startForegroundService first")
      return
    }
    try { svc.playFile(uri); promise.resolve(null) }
    catch (e: Exception) { promise.reject("PLAY_ERROR", e.message, e) }
  }

  @ReactMethod
  fun pause(promise: Promise) { boundService?.pausePlayback(); promise.resolve(null) }

  @ReactMethod
  fun resume(promise: Promise) { boundService?.resumePlayback(); promise.resolve(null) }

  @ReactMethod
  fun stopPlayback(promise: Promise) { boundService?.stopPlayback(); promise.resolve(null) }

  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Int) {}

  // ── TTS synthesis ─────────────────────────────────────────────────────────

  private fun ensureTTS(callback: (Boolean) -> Unit) {
    if (ttsReady && tts != null) { callback(true); return }
    tts = TextToSpeech(reactContext) { status ->
      ttsReady = status == TextToSpeech.SUCCESS
      if (ttsReady) installListener()
      callback(ttsReady)
    }
  }

  private fun installListener() {
    tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
      override fun onStart(id: String) {}
      override fun onDone(id: String) { pendingUtterances[id]?.latch?.countDown() }
      @Deprecated("Deprecated in API 21")
      override fun onError(id: String) {
        val s = pendingUtterances[id]; s?.error = "Synthesis error"; s?.latch?.countDown()
      }
      override fun onError(id: String, errorCode: Int) {
        val s = pendingUtterances[id]; s?.error = "Synthesis error: \${errorCode}"; s?.latch?.countDown()
      }
    })
  }

  private fun ReadableMap.safeString(key: String): String? =
    if (hasKey(key) && !isNull(key)) getString(key) else null

  private fun ReadableMap.safeDouble(key: String, default: Double): Double =
    if (hasKey(key) && !isNull(key)) getDouble(key) else default

  @ReactMethod
  fun synthesize(text: String, options: ReadableMap?, promise: Promise) {
    if (text.isBlank()) { promise.reject("TTS_EMPTY", "Text is empty"); return }

    synthExecutor.execute {
      ensureTTS { ready ->
        if (!ready) { promise.reject("TTS_INIT", "TextToSpeech failed to init"); return@ensureTTS }

        val engine   = tts!!
        val language = options?.safeString("language")
        val voiceId  = options?.safeString("voice")
        val rate     = options?.safeDouble("rate",  1.0)?.toFloat() ?: 1.0f
        val pitch    = options?.safeDouble("pitch", 1.0)?.toFloat() ?: 1.0f
        val locale   = if (language != null) Locale.forLanguageTag(language) else Locale.getDefault()

        when {
          voiceId != null -> {
            val match = engine.voices?.firstOrNull { it.name == voiceId }
            if (match != null) { engine.voice = match; currentVoice = match }
            else { engine.language = locale; currentVoice = engine.voice }
          }
          currentVoice != null -> engine.voice = currentVoice
          else -> { engine.language = locale; currentVoice = engine.voice }
        }

        engine.setSpeechRate(rate)
        engine.setPitch(pitch)

        val outFile = File(reactContext.cacheDir, "tts_\${UUID.randomUUID()}.wav")
        val uid     = UUID.randomUUID().toString()
        val state   = UtteranceState(CountDownLatch(1))
        pendingUtterances[uid] = state

        val result = engine.synthesizeToFile(text, Bundle(), outFile, uid)
        if (result == TextToSpeech.ERROR) {
          pendingUtterances.remove(uid)
          promise.reject("TTS_SYNTH", "synthesizeToFile returned ERROR immediately")
          return@ensureTTS
        }

        val finished = state.latch.await(30, TimeUnit.SECONDS)
        pendingUtterances.remove(uid)

        when {
          !finished              -> promise.reject("TTS_TIMEOUT", "Synthesis timed out (30 s)")
          state.error != null    -> promise.reject("TTS_SYNTH",   state.error)
          !outFile.exists()      -> promise.reject("TTS_FILE",    "Output file not created")
          outFile.length() == 0L -> promise.reject("TTS_FILE",    "Output file is empty")
          else                   -> promise.resolve("file://\${outFile.absolutePath}")
        }
      }
    }
  }

  @ReactMethod
  fun getAvailableVoices(language: String?, promise: Promise) {
    ensureTTS { ready ->
      if (!ready) { promise.resolve(Arguments.createArray()); return@ensureTTS }
      val filterLocale = if (language != null) Locale.forLanguageTag(language) else null
      val result = Arguments.createArray()
      tts?.voices
        ?.filter { v ->
          !v.isNetworkConnectionRequired &&
          (filterLocale == null || v.locale.language == filterLocale.language)
        }
        ?.forEach { v ->
          val map = Arguments.createMap()
          map.putString("identifier", v.name)
          map.putString("name", v.name.replace("-", " ").replaceFirstChar { it.uppercase() })
          map.putString("language", v.locale.toLanguageTag())
          result.pushMap(map)
        }
      promise.resolve(result)
    }
  }

  @ReactMethod
  fun clearCache(promise: Promise) {
    reactContext.cacheDir
      .listFiles { f -> f.name.startsWith("tts_") && f.name.endsWith(".wav") }
      ?.forEach { it.delete() }
    promise.resolve(null)
  }
}
`;
}

function buildPackageKt(packageName) {
  return `package ${packageName}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class TTSSynthesizerPackage : ReactPackage {
  override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> =
    listOf(TTSSynthesizerModule(ctx))

  override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`;
}

function buildServiceKt(packageName) {
  return `package ${packageName}

import android.app.*
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class TTSSynthesizerService : Service() {

  companion object {
    const val CHANNEL_ID      = "tts_playback_channel"
    const val NOTIFICATION_ID = 7788
    const val ACTION_START    = "TTS_START"
    const val ACTION_STOP     = "TTS_STOP"
  }

  inner class LocalBinder : Binder() {
    fun getService(): TTSSynthesizerService = this@TTSSynthesizerService
  }

  private val binder = LocalBinder()
  private var mediaPlayer: MediaPlayer? = null
  var onPlaybackFinished: (() -> Unit)? = null
  var onPlaybackError: ((String) -> Unit)? = null

  override fun onBind(intent: Intent?): IBinder = binder

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopPlayback()
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }
    startForeground(NOTIFICATION_ID, buildNotification())
    return START_STICKY
  }

  override fun onDestroy() {
    stopPlayback()
    super.onDestroy()
  }

  fun playFile(uri: String) {
    stopPlayback()
    val filePath = if (uri.startsWith("file://")) uri.removePrefix("file://") else uri
    mediaPlayer = MediaPlayer().apply {
      setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()
      )
      setDataSource(filePath)
      prepare()
      setOnCompletionListener { onPlaybackFinished?.invoke() }
      setOnErrorListener { _, what, extra ->
        onPlaybackError?.invoke("MediaPlayer error: what=\${what} extra=\${extra}")
        true
      }
      start()
    }
  }

  fun pausePlayback()  { mediaPlayer?.takeIf { it.isPlaying }?.pause() }
  fun resumePlayback() { mediaPlayer?.takeIf { !it.isPlaying }?.start() }

  fun stopPlayback() {
    mediaPlayer?.apply { if (isPlaying) stop(); reset(); release() }
    mediaPlayer = null
  }

  val isPlaying: Boolean get() = mediaPlayer?.isPlaying == true

  private fun buildNotification(): Notification {
    val openIntent = packageManager
      .getLaunchIntentForPackage(packageName)
      ?.apply { flags = Intent.FLAG_ACTIVITY_SINGLE_TOP }
    val pending = PendingIntent.getActivity(
      this, 0, openIntent ?: Intent(),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Reading aloud")
      .setContentText("Tap to return to the app")
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentIntent(pending)
      .setOngoing(true)
      .setSilent(true)
      .build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID, "TTS Playback", NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Keeps text-to-speech running while the screen is off"
        setShowBadge(false)
      }
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }
}
`;
}

// ─── File writer mod ──────────────────────────────────────────────────────────

const withTTSSynthesizerFiles = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const packageName = cfg.android?.package ?? cfg.applicationId ?? 'com.example.app';
      const javaDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/java',
        packageName.replace(/\./g, '/')
      );

      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(
        path.join(javaDir, 'TTSSynthesizerModule.kt'),
        buildModuleKt(packageName),
        'utf8'
      );
      fs.writeFileSync(
        path.join(javaDir, 'TTSSynthesizerPackage.kt'),
        buildPackageKt(packageName),
        'utf8'
      );
      fs.writeFileSync(
        path.join(javaDir, 'TTSSynthesizerService.kt'),
        buildServiceKt(packageName),
        'utf8'
      );

      console.log(`[withTTSSynthesizer] Wrote Kotlin files to ${javaDir}`);
      return cfg;
    },
  ]);

// ─── AndroidManifest patcher ─────────────────────────────────────────────────

const withTTSSynthesizerManifest = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    if (!manifest['uses-permission']) manifest['uses-permission'] = [];

    const neededPermissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.WAKE_LOCK',
      'android.permission.POST_NOTIFICATIONS',
    ];

    for (const perm of neededPermissions) {
      const already = manifest['uses-permission'].some((p) => p.$?.['android:name'] === perm);
      if (!already) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    const app = manifest.application?.[0];
    if (!app) return cfg;
    if (!app.service) app.service = [];

    const packageName = cfg.android?.package ?? cfg.applicationId ?? 'com.example.app';
    const serviceName = `${packageName}.TTSSynthesizerService`;
    const already = app.service.some((s) => s.$?.['android:name'] === serviceName);

    if (!already) {
      app.service.push({
        $: {
          'android:name': serviceName,
          'android:foregroundServiceType': 'mediaPlayback',
          'android:exported': 'false',
        },
      });
    }

    return cfg;
  });

// ─── MainApplication patcher ─────────────────────────────────────────────────

const withTTSSynthesizerMainApp = (config) =>
  withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;
    const packageName = cfg.android?.package ?? cfg.applicationId ?? 'com.example.app';
    const importLine = `import ${packageName}.TTSSynthesizerPackage`;
    const registerLine = `            packages.add(TTSSynthesizerPackage())`;

    if (!src.includes(importLine)) {
      src = src.replace(/(import expo\.modules\.ReactNativeHostWrapper\n)/, `$1${importLine}\n`);
    }
    if (!src.includes('TTSSynthesizerPackage()')) {
      src = src.replace(/(val packages = PackageList\(this\)\.packages\n)/, `$1${registerLine}\n`);
    }

    cfg.modResults.contents = src;
    return cfg;
  });

// ─── Composed plugin ─────────────────────────────────────────────────────────

const withTTSSynthesizer = (config) => {
  config = withTTSSynthesizerFiles(config);
  config = withTTSSynthesizerManifest(config);
  config = withTTSSynthesizerMainApp(config);
  return config;
};

module.exports = withTTSSynthesizer;
