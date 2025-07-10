import * as Haptics from "expo-haptics";

type StyleKey = keyof typeof Haptics.ImpactFeedbackStyle;

export const useHaptics = () => {
  function vibration(styleKey: StyleKey = "Medium") {
    const enumValue = Haptics.ImpactFeedbackStyle[styleKey];
    Haptics.impactAsync(enumValue);
  }

  return { vibration };
};
