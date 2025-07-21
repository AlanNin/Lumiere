import { TouchableOpacity, View } from "react-native";
import BottomDrawer from "../bottomDrawer";
import { Text } from "../defaults";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { RefObject, useState } from "react";
import { Image } from "expo-image";
import { pickAndSaveImage } from "@/lib/image-picker";
import { useMutation } from "@tanstack/react-query";
import { novelController } from "@/server/controllers/novel";
import { deleteImage } from "@/lib/file-system";
import { invalidateQueries } from "@/providers/reactQuery";
import { RotateCcw } from "lucide-react-native";
import { colors } from "@/lib/constants";

export default function NovelMoreChapterDrawer({
  bottomDrawerRef,
  novelTitle,
  novelImageUrl,
  novelCustomImageUri,
  refetchNovelInfo,
}: {
  bottomDrawerRef: RefObject<BottomSheetModal | null>;
  novelTitle: string;
  novelImageUrl: string;
  novelCustomImageUri?: string | null;
  refetchNovelInfo: () => void;
}) {
  const [selectedOption, setSelectedOption] = useState<string>("");

  const OPTIONS = [
    {
      key: "set-custom-cover",
      label: "Set Custom Cover",
    },
  ];

  function handleClose() {
    setSelectedOption("");
    bottomDrawerRef.current?.dismiss();
  }

  const { mutate: updateNovelCustomImage } = useMutation({
    mutationFn: ({ customImageUri }: { customImageUri: string }) =>
      novelController.updateNovelCustomImage({
        novelTitle,
        customImageUri,
      }),
    onSuccess: () => {
      refetchNovelInfo();
      handleClose();
      invalidateQueries(["library"], ["explore-novels"], ["history"]);
    },
  });

  function renderDefault() {
    return (
      <View className="flex flex-col gap-y-4 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">More Options</Text>
        <View className="flex flex-col gap-y-4 w-full px-12">
          {OPTIONS.map((option) => (
            <TouchableOpacity
              className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
              onPress={() => setSelectedOption(option.key)}
              key={option.key}
            >
              <Text className="text-center">{option.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
            onPress={handleClose}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderChangeNovelCover() {
    const hasCustomImage = novelCustomImageUri !== null;
    const imageUrl = hasCustomImage ? novelCustomImageUri : novelImageUrl;

    async function handleChangeCover() {
      const result = await pickAndSaveImage();

      if (result.canceled) {
        return;
      }

      updateNovelCustomImage({ customImageUri: result.uri });
    }

    async function handleDeleteCover() {
      await deleteImage({ sourceUri: novelCustomImageUri ?? "" });
      updateNovelCustomImage({ customImageUri: "" });
    }

    return (
      <View className="flex flex-col gap-y-4 items-center justify-center text-center pb-4 flex-1">
        <Text className="text-lg font-medium text-center">
          {OPTIONS[0].label}
        </Text>
        <View className="relative rounded-lg overflow-hidden">
          <Image
            alt={`Cover of ${novelTitle}`}
            source={imageUrl}
            style={{ aspectRatio: 1 / 1.5, height: 182 }}
            contentFit="cover"
          />
          {hasCustomImage && (
            <TouchableOpacity
              className="absolute top-0 right-0 p-3 bg-black/75 rounded-bl-lg"
              onPress={handleDeleteCover}
            >
              <RotateCcw size={16} color={colors.muted_foreground} />
            </TouchableOpacity>
          )}
        </View>

        <Text className="text-muted_foreground/75 text-center mb-2">
          {hasCustomImage ? "Custom" : "Default"}
        </Text>
        <View className="flex flex-col gap-y-4 w-full px-16">
          <TouchableOpacity
            className="bg-primary text-primary_foreground px-6 py-3 rounded-lg w-full flex items-center justify-center"
            onPress={handleChangeCover}
          >
            <Text className="text-center">Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="px-4 py-1 rounded-lg w-full flex items-center justify-center"
            onPress={() => setSelectedOption("")}
          >
            <Text>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <BottomDrawer ref={bottomDrawerRef} onClose={() => setSelectedOption("")}>
      {!selectedOption && renderDefault()}
      {selectedOption === OPTIONS[0].key && renderChangeNovelCover()}
    </BottomDrawer>
  );
}
