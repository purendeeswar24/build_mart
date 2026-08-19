import React, { useEffect, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';

type WebScrollView = ScrollView & {
  getScrollableNode?: () => unknown;
};

let webkitCssReady = false;

function hideWebkitScrollbar(node: HTMLElement) {
  node.setAttribute('data-hscroll', 'true');
  node.style.cursor = 'grab';
  if (webkitCssReady || typeof document === 'undefined') return;
  webkitCssReady = true;
  const el = document.createElement('style');
  el.textContent =
    '[data-hscroll]::-webkit-scrollbar{display:none;width:0;height:0}' +
    '[data-hscroll]{scrollbar-width:none;-ms-overflow-style:none;cursor:grab}';
  document.head.appendChild(el);
}

/** Horizontal row. Vertical wheel scrolls the page; drag or horizontal wheel moves the row. */
export function HScroll({ style, children, ...rest }: ScrollViewProps) {
  const ref = useRef<WebScrollView>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let node: HTMLElement | undefined;
    let raf = 0;
    let attempts = 0;
    let cleanup: (() => void) | undefined;

    const attach = () => {
      const found = ref.current?.getScrollableNode?.() as HTMLElement | undefined;
      if (!found || typeof found.addEventListener !== 'function') {
        if (attempts++ < 20) raf = requestAnimationFrame(attach);
        return;
      }
      node = found;
      hideWebkitScrollbar(node);

      let dragging = false;
      let moved = false;
      let startX = 0;
      let startLeft = 0;

      const onWheel = (e: WheelEvent) => {
        const absX = Math.abs(e.deltaX);
        const absY = Math.abs(e.deltaY);
        if (absX > absY && absX > 0) {
          e.preventDefault();
          node!.scrollLeft += e.deltaX;
        }
      };

      const onPointerDown = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        dragging = true;
        moved = false;
        startX = e.clientX;
        startLeft = node!.scrollLeft;
        node!.style.cursor = 'grabbing';
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 8) moved = true;
        if (!moved) return;
        e.preventDefault();
        node!.scrollLeft = startLeft - dx;
      };

      const endDrag = () => {
        dragging = false;
        if (node) node.style.cursor = 'grab';
      };

      const onClickCapture = (e: Event) => {
        if (!moved) return;
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      };

      node.addEventListener('wheel', onWheel, { passive: false });
      node.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      node.addEventListener('click', onClickCapture, true);

      cleanup = () => {
        node?.removeEventListener('wheel', onWheel);
        node?.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
        node?.removeEventListener('click', onClickCapture, true);
      };
    };

    attach();
    return () => {
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, []);

  return (
    <ScrollView
      ref={ref}
      horizontal
      nestedScrollEnabled
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      decelerationRate="fast"
      style={[styles.hideBar, style]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hideBar: {
    maxWidth: '100%',
    ...(Platform.OS === 'web'
      ? ({
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as object)
      : null),
  },
});
