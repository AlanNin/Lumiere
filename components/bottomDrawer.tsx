import {
  ComponentProps,
  ReactNode,
  RefObject,
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  BackHandler,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { colors } from "@/lib/constants";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ListStyle = ComponentProps<typeof BottomSheetFlatList>["style"];

const BottomDrawer = forwardRef<
  BottomSheetModal,
  Omit<
    {
      children?: ReactNode;
      paddingBottom?: number;
      disableClose?: boolean;
      onChange?: (boolean: number) => void;
      onClose?: () => void;
      renderList?: ({ style }: { style?: ListStyle }) => ReactNode;
    },
    "ref"
  >
>(
  (
    { children, paddingBottom, disableClose, onChange, onClose, renderList },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();

    const closeDrawer = () => {
      if (disableClose) {
        return;
      }

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

    const containerStyle = useMemo(
      () => ({
        padding: 20,
        paddingBottom: paddingBottom ? paddingBottom : insets.bottom,
      }),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
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
        enablePanDownToClose={!disableClose}
        enableContentPanningGesture={!disableClose}
        enableHandlePanningGesture={!disableClose}
        enableOverDrag={!disableClose}
        enableDismissOnClose={!disableClose}
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
        maxDynamicContentSize={renderList ? height / 1.3 : undefined}
      >
        {renderList ? (
          renderList({
            style: { ...containerStyle },
          })
        ) : (
          <BottomSheetView style={containerStyle}>{children}</BottomSheetView>
        )}
      </BottomSheetModal>
    );
  }
);

export default BottomDrawer;
