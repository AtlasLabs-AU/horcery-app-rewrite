import {
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_600SemiBold_Italic,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Platform } from 'react-native';

/**
 * One cross-platform font vocabulary for every app-owned text surface.
 *
 * Each weight has its own family name. This avoids synthetic weights and keeps
 * the same typography on iOS and Android. Monospace remains a system face only
 * where the content itself is code or a diagnostic payload.
 */
export const font = {
  regular: 'Inter_400Regular',
  italic: 'Inter_400Regular_Italic',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  semiboldItalic: 'Inter_600SemiBold_Italic',
  bold: 'Inter_700Bold',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
} as const;

/** Local font assets loaded before the splash screen is dismissed. */
export const interFontSources = {
  [font.regular]: Inter_400Regular,
  [font.italic]: Inter_400Regular_Italic,
  [font.medium]: Inter_500Medium,
  [font.semibold]: Inter_600SemiBold,
  [font.semiboldItalic]: Inter_600SemiBold_Italic,
  [font.bold]: Inter_700Bold,
};
