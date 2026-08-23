import React, { createContext, useContext, useMemo, useState } from 'react';
import { Dimensions } from 'react-native';
import {
  categoryColumns,
  featuredColumns,
  gutterFor,
  layout,
} from '../theme/layout';

type LayoutValue = {
  width: number;
  gutter: number;
  cardGap: number;
  isMobile: boolean;
  isDesktop: boolean;
  featuredCols: number;
  categoryCols: number;
};

function valueFromWidth(width: number): LayoutValue {
  return {
    width,
    gutter: gutterFor(width),
    cardGap: width < layout.mobileMax ? 12 : 16,
    isMobile: width < layout.mobileMax,
    isDesktop: width >= layout.tabletMax + 1,
    featuredCols: featuredColumns(width),
    categoryCols: categoryColumns(width),
  };
}

const LayoutContext = createContext<LayoutValue>(
  valueFromWidth(Math.min(Dimensions.get('window').width, layout.contentMaxWidth)),
);

export function LayoutProvider({
  width,
  children,
}: {
  width: number;
  children: React.ReactNode;
}) {
  const value = useMemo(() => valueFromWidth(width), [width]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  return useContext(LayoutContext);
}

export function useMeasuredWidth(fallback: number) {
  const [w, setW] = useState(fallback);
  return {
    width: w,
    onLayout: (e: { nativeEvent: { layout: { width: number } } }) => {
      const next = Math.round(e.nativeEvent.layout.width);
      if (next > 0 && next !== w) setW(next);
    },
  };
}
