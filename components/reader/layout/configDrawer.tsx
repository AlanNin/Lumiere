import { BottomSheetModal } from '@gorhom/bottom-sheet';
import BottomDrawer from '../../bottomDrawer';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '../../defaults';
import { SliderComponent } from '../../slider';
import { colors } from '@/lib/constants';
import { ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList } from 'react-native-gesture-handler';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Check,
  LucideIcon,
  Minus,
  Plus,
} from 'lucide-react-native';
import { ReaderGeneralConfig, ReaderStyleConfig } from '@/types/appConfig';
import { TextAlgin, VoiceIdentifier } from '@/types/reader';
import BooleanSwitch from '@/components/switch';
import { Picker } from '@react-native-picker/picker';

export default function ReaderStyleConfigDrawer({
  drawerRef,
  insets,
  toggleHoldHide,
  styles,
  setReaderStylesConfig,
  readerGeneralConfig,
  setReaderGeneralConfig,
  pointerEvents,
  availableVoices,
}: {
  drawerRef: RefObject<BottomSheetModal | null>;
  insets: { top: number; bottom: number };
  toggleHoldHide: (isClosing: boolean) => void;
  styles: ReaderStyleConfig;
  setReaderStylesConfig: (styles: ReaderStyleConfig) => void;
  readerGeneralConfig: ReaderGeneralConfig;
  setReaderGeneralConfig: (config: ReaderGeneralConfig) => void;
  pointerEvents: 'auto' | 'none';
  availableVoices: VoiceIdentifier[];
}) {
  const [readerStylesConfigState, setReaderStylesConfigState] = useState<ReaderStyleConfig>({
    body: {
      backgroundColor: styles.body.backgroundColor,
      color: styles.body.color,
      textAlign: styles.body.textAlign,
      lineHeight: styles.body.lineHeight,
    },
    h4: {
      fontSize: styles.h4.fontSize,
    },
    p: {
      fontSize: styles.p.fontSize,
    },
  });

  const [readerGeneralConfigState, setReaderGeneralConfigState] = useState<ReaderGeneralConfig>({
    showProgressSeekBar: readerGeneralConfig.showProgressSeekBar,
    speechSpeed: readerGeneralConfig.speechSpeed,
    voiceIdentifier: readerGeneralConfig.voiceIdentifier,
  });

  const initialReaderStylesConfigStateRef = useRef<ReaderStyleConfig>(readerStylesConfigState);

  const initialReaderGeneralConfigStateRef = useRef<ReaderGeneralConfig>(readerGeneralConfigState);

  useEffect(() => {
    setReaderStylesConfig(readerStylesConfigState);
    setReaderGeneralConfig(readerGeneralConfigState);
    initialReaderStylesConfigStateRef.current = readerStylesConfigState;
    initialReaderGeneralConfigStateRef.current = readerGeneralConfigState;
  }, [readerStylesConfigState, readerGeneralConfigState]);

  function handleReset() {
    setReaderStylesConfigState(initialReaderStylesConfigStateRef.current);
    setReaderGeneralConfigState(initialReaderGeneralConfigStateRef.current);
  }

  return (
    <BottomDrawer
      ref={drawerRef}
      paddingBottom={insets.bottom}
      onChange={(index: number) => {
        toggleHoldHide(index === 0);
      }}
      onClose={handleReset}>
      <View className="flex flex-col gap-y-8 pb-4" pointerEvents={pointerEvents}>
        <ConfigItem label="Heading Size">
          <SliderComponent
            minValue={20}
            maxValue={36}
            value={readerStylesConfigState.h4.fontSize}
            onChange={(value) =>
              setReaderStylesConfigState((prev) => ({
                ...prev,
                h4: { ...prev.h4, fontSize: value },
              }))
            }
          />
        </ConfigItem>
        <ConfigItem label="Text Size">
          <SliderComponent
            minValue={16}
            maxValue={32}
            value={readerStylesConfigState.p.fontSize}
            onChange={(value) =>
              setReaderStylesConfigState((prev) => {
                const multiplier = prev.body.lineHeight / prev.p.fontSize;

                const newLineHeight = Math.round(multiplier * value);

                return {
                  ...prev,
                  body: {
                    ...prev.body,
                    lineHeight: newLineHeight,
                  },
                  p: {
                    ...prev.p,
                    fontSize: value,
                  },
                };
              })
            }
          />
        </ConfigItem>
        <ConfigItem label="Color">
          <ColorItems
            value={{
              backgroundColor: readerStylesConfigState.body.backgroundColor,
              color: readerStylesConfigState.body.color,
            }}
            onChange={(value) =>
              setReaderStylesConfigState((prev) => ({
                ...prev,
                body: {
                  ...prev.body,
                  backgroundColor: value.backgroundColor,
                  color: value.color,
                },
              }))
            }
          />
        </ConfigItem>
        <ConfigItem label="Text Align">
          <TextAlignItems
            value={readerStylesConfigState.body.textAlign}
            onChange={(value) =>
              setReaderStylesConfigState((prev) => ({
                ...prev,
                body: {
                  ...prev.body,
                  textAlign: value,
                },
              }))
            }
          />
        </ConfigItem>
        <ConfigItem label="Line Height">
          <LineHeightItem
            value={readerStylesConfigState.body.lineHeight}
            onChange={(value) =>
              setReaderStylesConfigState((prev) => ({
                ...prev,
                body: {
                  ...prev.body,
                  lineHeight: value,
                },
              }))
            }
            fontSize={readerStylesConfigState.p.fontSize}
          />
        </ConfigItem>
        <ConfigItem label="Show Seek Bar">
          <BooleanSwitch
            value={readerGeneralConfigState.showProgressSeekBar}
            onChange={(value) =>
              setReaderGeneralConfigState((prev) => ({
                ...prev,
                showProgressSeekBar: value,
              }))
            }
          />
        </ConfigItem>
        <ConfigItem label="Speech Speed">
          <SliderComponent
            minValue={0.7}
            maxValue={1.5}
            defaultInvervals={8}
            value={readerGeneralConfigState.speechSpeed}
            onChange={(value) =>
              setReaderGeneralConfigState((prev) => ({
                ...prev,
                speechSpeed: value,
              }))
            }
          />
        </ConfigItem>
        <ConfigItem label="Speech Voice">
          <Picker
            selectedValue={readerGeneralConfigState.voiceIdentifier}
            onValueChange={(value) => {
              setReaderGeneralConfigState((prev) => ({
                ...prev,
                voiceIdentifier: value,
              }));
            }}
            style={{
              width: 200,
              backgroundColor: colors.muted_foreground + '25',
            }}
            enabled={availableVoices.length > 1}>
            {availableVoices.map((voice, idx) => (
              <Picker.Item
                key={voice.identifier}
                label={`Voice - ${idx + 1}`}
                value={voice.identifier}
                style={{
                  color: colors.foreground,
                }}
              />
            ))}
          </Picker>
        </ConfigItem>
      </View>
    </BottomDrawer>
  );
}

function ConfigItem({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View className="flex flex-row items-center">
      <Text className="w-32">{label}</Text>
      {children}
    </View>
  );
}

function ColorItems({
  value,
  onChange,
}: {
  value: { backgroundColor: string; color: string };
  onChange: ({ backgroundColor, color }: { backgroundColor: string; color: string }) => void;
}) {
  const readerColors = colors.reader;
  type ThemeKey = keyof typeof readerColors;
  const entries = useMemo(
    () => Object.entries(readerColors) as [ThemeKey, { background: string; foreground: string }][],
    [readerColors]
  );

  const renderItem = useCallback(
    ({ item }: { item: [ThemeKey, { background: string; foreground: string }]; index: number }) => {
      const [{ background, foreground }] = [item[1]];
      const isSelected = value.backgroundColor === background && value.color === foreground;

      return (
        <TouchableOpacity
          className="flex size-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: background,
          }}
          disabled={isSelected}
          onPress={() => {
            if (isSelected) return;
            onChange({
              backgroundColor: background,
              color: foreground,
            });
          }}>
          {isSelected ? (
            <Check size={16} color={foreground} />
          ) : (
            <Text style={{ color: foreground }}>T</Text>
          )}
        </TouchableOpacity>
      );
    },
    [value]
  );

  return (
    <View className="ml-auto flex-1">
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={([themeName]) => themeName}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 12,
        }}
        nestedScrollEnabled={true}
      />
    </View>
  );
}

function TextAlignItems({
  value,
  onChange,
}: {
  value: TextAlgin;
  onChange: (value: TextAlgin) => void;
}) {
  const entries: {
    key: TextAlgin;
    Icon: LucideIcon;
  }[] = [
    {
      key: 'left',
      Icon: AlignLeft,
    },
    {
      key: 'right',
      Icon: AlignRight,
    },
    {
      key: 'center',
      Icon: AlignCenter,
    },
    {
      key: 'justify',
      Icon: AlignJustify,
    },
  ];

  const renderItem = useCallback(
    ({ item }: { item: { key: TextAlgin; Icon: LucideIcon }; index: number }) => {
      const isSelected = value === item.key;
      return (
        <TouchableOpacity
          className="flex size-9 items-center justify-center rounded-full"
          disabled={isSelected}
          onPress={() => {
            if (isSelected) return;
            onChange(item.key);
          }}>
          <item.Icon size={20} color={isSelected ? colors.primary : colors.foreground} />
        </TouchableOpacity>
      );
    },
    [value]
  );

  return (
    <View className="flex-1">
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={({ key }) => key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 12,
        }}
        nestedScrollEnabled={true}
      />
    </View>
  );
}

function LineHeightItem({
  value,
  onChange,
  fontSize,
}: {
  value: number;
  onChange: (value: number) => void;
  fontSize: number;
}) {
  const multiplier = parseFloat((value / fontSize).toFixed(1));

  const increase = () => {
    const next = parseFloat((multiplier + 0.1).toFixed(1));
    onChange(next * fontSize);
  };
  const decrease = () => {
    const next = parseFloat(Math.max(1, multiplier - 0.1).toFixed(1));
    onChange(next * fontSize);
  };

  return (
    <View className="flex flex-row items-center gap-x-4">
      <TouchableOpacity onPress={decrease}>
        <Minus size={20} color={colors.primary} />
      </TouchableOpacity>

      <Text>{multiplier}</Text>

      <TouchableOpacity onPress={increase}>
        <Plus size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}
