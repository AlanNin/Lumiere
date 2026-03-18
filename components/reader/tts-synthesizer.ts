import { NativeModules } from 'react-native';

export interface TTSVoice {
  identifier: string;
  name: string;
  language: string;
}

export interface SynthesizeOptions {
  language?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

interface TTSSynthesizerInterface {
  synthesize(text: string, options?: SynthesizeOptions): Promise<string>;
  getAvailableVoices(language?: string): Promise<TTSVoice[]>;
  clearCache(): Promise<void>;
  startForegroundService(): Promise<void>;
  stopForegroundService(): Promise<void>;
}

const { TTSSynthesizer } = NativeModules;

if (!TTSSynthesizer) {
  console.warn('TTSSynthesizer native module not found. Did you rebuild the app?');
}

export default TTSSynthesizer as TTSSynthesizerInterface;
