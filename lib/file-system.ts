import * as FileSystem from "expo-file-system";

export async function saveImage({
  sourceUri,
  folderName = "images",
  fileName = "default",
}: {
  sourceUri: string;
  folderName?: string;
  fileName?: string;
}): Promise<{ uri: string; fileName: string }> {
  const dir = `${FileSystem.documentDirectory}${folderName}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const ext = await resolveExtension(sourceUri);
  const destFilename = `${fileName}_${Date.now()}.${ext}`;
  const destUri = `${dir}${destFilename}`;

  let finalUri: string;
  if (sourceUri.startsWith("http")) {
    const { uri: localUri } = await FileSystem.downloadAsync(
      sourceUri,
      destUri
    );
    finalUri = localUri;
  } else {
    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
    finalUri = destUri;
  }

  return { uri: finalUri, fileName: destFilename };
}

export async function deleteImage({
  sourceUri,
}: {
  sourceUri: string;
}): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(sourceUri);
    if (info.exists) {
      await FileSystem.deleteAsync(sourceUri);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
}

async function resolveExtension(uri: string): Promise<string> {
  const pathMatch = uri.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  if (pathMatch) {
    return pathMatch[1].toLowerCase();
  }

  if (uri.startsWith("http")) {
    try {
      const res = await fetch(uri, { method: "HEAD" });
      const contentType = res.headers.get("content-type") || "";
      const mimeExt = contentType.split("/").pop();
      if (mimeExt) {
        return mimeExt.replace(/[^a-z0-9]/gi, "").toLowerCase();
      }
    } catch {}
  }

  return "jpg";
}
