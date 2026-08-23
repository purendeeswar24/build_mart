/** Shared breakpoints — one app for phone and desktop web */
export const layout = {
  pageGutterMobile: 16,
  pageGutterDesktop: 32,
  contentMaxWidth: 1180,
  mobileMax: 719,
  tabletMax: 1099,
} as const;

export function gutterFor(width: number) {
  return width < layout.mobileMax ? layout.pageGutterMobile : layout.pageGutterDesktop;
}

export function featuredColumns(width: number) {
  if (width >= 1100) return 4;
  if (width >= 720) return 3;
  return 2;
}

export function categoryColumns(width: number) {
  if (width >= 1100) return 8;
  if (width >= 720) return 6;
  return 4;
}
