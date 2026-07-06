import * as FileSystem from 'expo-file-system';

const MEMORY_CACHE_DIR = `${FileSystem.cacheDirectory}covers/`;
const PERSISTENT_CACHE_DIR = `${FileSystem.documentDirectory}covers/`;

async function ensureDirExists(dir: string) {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

function hashUri(uri: string) {
  let hash = 0;
  for (let i = 0; i < uri.length; i++) {
    hash = (hash << 5) - hash + uri.charCodeAt(i);
    hash |= 0;
  }
  const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
  return `${Math.abs(hash)}.${ext}`;
}

export async function getCachedImageUri(
  remoteUri: string,
  persistent = false
): Promise<string | null> {
  if (remoteUri.startsWith('file://') || remoteUri.startsWith('content://')) {
    const info = await FileSystem.getInfoAsync(remoteUri);
    return info.exists ? remoteUri : null;
  }

  const dir = persistent ? PERSISTENT_CACHE_DIR : MEMORY_CACHE_DIR;
  await ensureDirExists(dir);

  const localPath = dir + hashUri(remoteUri);
  const fileInfo = await FileSystem.getInfoAsync(localPath);

  if (fileInfo.exists) {
    return localPath;
  }

  try {
    const result = await FileSystem.downloadAsync(remoteUri, localPath);
    if (result.status !== 200) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      return null;
    }
    return localPath;
  } catch (err) {
    return null;
  }
}

async function getDirSizeRecursive(dir: string): Promise<number> {
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) return 0;

  const entries = await FileSystem.readDirectoryAsync(dir);
  let total = 0;

  for (const entry of entries) {
    const entryPath = `${dir}${entry}`;
    const entryInfo = await FileSystem.getInfoAsync(entryPath, { size: true });

    if (!entryInfo.exists) continue;

    if (entryInfo.isDirectory) {
      total += await getDirSizeRecursive(`${entryPath}/`);
    } else if ('size' in entryInfo) {
      total += entryInfo.size;
    }
  }

  return total;
}

export async function getImageCacheSizeInMB(): Promise<number> {
  try {
    const bytes = await getDirSizeRecursive(MEMORY_CACHE_DIR);
    return bytes / (1024 * 1024);
  } catch {
    return 0;
  }
}

export async function clearVolatileImageCache() {
  await FileSystem.deleteAsync(MEMORY_CACHE_DIR, { idempotent: true });
}
