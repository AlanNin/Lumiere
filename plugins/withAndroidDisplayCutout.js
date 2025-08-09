const { withDangerousMod, AndroidConfig } = require("expo/config-plugins");
const fs = require("fs/promises");
const path = require("path");

const withAndroidDisplayCutout = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const resDir = await AndroidConfig.Paths.getResourceFolderAsync(
        config.modRequest.projectRoot
      );
      const valuesV28Path = path.join(resDir, "values-v28");
      const stylesFilePath = path.resolve(valuesV28Path, "styles.xml");

      if (!(await pathExistsAsync(valuesV28Path))) {
        await fs.mkdir(valuesV28Path, { recursive: true });
      }

      const stylesContent = `
      <resources xmlns:tools="http://schemas.android.com/tools">
        <style name="AppTheme" parent="Theme.Material3.DayNight.NoActionBar">
          <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
          <item name="colorPrimary">@color/colorPrimary</item>
          <item name="android:windowBackground">@color/activityBackground</item>
          <item name="android:windowLightStatusBar">false</item>
          <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        </style>
        <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
          <item name="windowSplashScreenBackground">@color/splashscreen_background</item>
          <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>
          <item name="postSplashScreenTheme">@style/AppTheme</item>
        </style>
      </resources>
      `.trim();

      await fs.writeFile(stylesFilePath, stylesContent);

      return config;
    },
  ]);
};

async function pathExistsAsync(file) {
  try {
    await fs.stat(file);
    return true;
  } catch {
    return false;
  }
}

module.exports = withAndroidDisplayCutout;
