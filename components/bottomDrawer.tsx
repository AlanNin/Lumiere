import { ReactNode, RefObject, forwardRef, useCallback, useState } from "react";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import { BackHandler, TouchableOpacity } from "react-native";
import { colors } from "@/lib/constants";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BottomDrawer = forwardRef<
  BottomSheetModal,
  Omit<
    {
      children: ReactNode;
      paddingBottom?: number;
      onChange?: (boolean: number) => void;
      onClose?: () => void;
    },
    "ref"
  >
>(({ children, paddingBottom, onChange, onClose }, ref) => {
  const insets = useSafeAreaInsets();

  const closeDrawer = () => {
    (ref as RefObject<BottomSheetModal>).current?.dismiss();
    if (onClose) {
      onClose();
    }
  };

  const [sheetStatus, setSheetStatus] = useState<"open" | "close">("close");

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (sheetStatus === "open") {
          closeDrawer();
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => {
        backHandler.remove();
      };
    }, [sheetStatus])
  );

  return (
    <BottomSheetModalProvider>
      <BottomSheetModal
        onChange={(status) => {
          if (status === 0) {
            setSheetStatus("open");
          } else {
            setSheetStatus("close");
          }
          if (onChange) {
            onChange(status);
          }
        }}
        ref={ref}
        backdropComponent={() => (
          <TouchableOpacity
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 20,
            }}
            activeOpacity={1}
            onPress={closeDrawer}
          />
        )}
        backgroundStyle={{
          backgroundColor: colors.layout_background,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.grayscale,
        }}
        containerStyle={{
          zIndex: 30,
        }}
      >
        <BottomSheetView
          style={{
            padding: 20,
            paddingBottom: paddingBottom ? paddingBottom : insets.bottom,
          }}
        >
          {children}
        </BottomSheetView>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  );
});

export default BottomDrawer;
