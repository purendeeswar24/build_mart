import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Phone / small tablet / desktop */
export const BP = {
  phone: 600,
  tablet: 1024,
} as const;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isPhone = width < BP.phone;
  const isTablet = width >= BP.phone && width < BP.tablet;
  const isDesktop = width >= BP.tablet;
  const compact = width < 768;
  const hPad = isPhone ? 14 : 20;
  const tabContentH = isPhone ? 52 : 46;
  const tabBottomPad = insets.bottom;
  const tabH = tabContentH + tabBottomPad;

  return {
    width,
    height,
    insets,
    isPhone,
    isTablet,
    isDesktop,
    compact,
    hPad,
    tabContentH,
    tabBottomPad,
    tabH,
  };
}
