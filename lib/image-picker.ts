import * as ImagePicker from "expo-image-picker";
import { saveImage } from "./file-system";

export type PickResult = {
  canceled: boolean;
  uri: string;
};

export async function pickImage({}: {} = {}): Promise<PickResult> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 1,
    allowsMultipleSelection: false,
    selectionLimit: 1,
  });

  if (result.canceled) {
    return { canceled: true, uri: "" };
  }

  const uris = result.assets.map((asset) => asset.uri);
  return { canceled: false, uri: uris[0] };
}

export async function pickAndSaveImage({}: {} = {}): Promise<PickResult> {
  const result = await pickImage();

  if (result.canceled) {
    return result;
  }

  const { uri: savedImageUri } = await saveImage({
    sourceUri: result.uri,
  });

  return { canceled: false, uri: savedImageUri };
}
