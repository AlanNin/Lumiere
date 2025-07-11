import { colors } from "./lib/constants";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}"],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: colors.background,
        foreground: colors.foreground,
        foreground_invert: colors.foreground_invert,
        primary: colors.primary,
        primary_foreground: colors.primary_foreground,
        primary_dark: colors.primary_dark,
        secondary: colors.secondary,
        secondary_foreground: colors.secondary_foreground,
        highlight: colors.highlight,
        grayscale: colors.grayscale,
        grayscale_foreground: colors.grayscale_foreground,
        muted: colors.muted,
        muted_foreground: colors.muted_foreground,
        layout_background: colors.layout_background,
      },
    },
  },
  plugins: [],
};
