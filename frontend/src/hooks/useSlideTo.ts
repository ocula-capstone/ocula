import { useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

// Where to draw a highlight so it sits on the selected item inside `ref`, and slides there when the
// selection changes. `selector` finds the selected item; `deps` are what change when it does.
// `style` is for an absolutely positioned element in the same container; it stays put (no slide)
// on the first paint so nothing animates in from the corner.
export function useSlideTo(
  ref: RefObject<HTMLElement | null>,
  selector: string,
  deps: unknown[],
): { style: CSSProperties; animate: boolean; found: boolean } {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const el = root.querySelector<HTMLElement>(selector);
      setBox(
        el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null,
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const watcher = new ResizeObserver(measure);
    watcher.observe(root);
    return () => watcher.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return {
    found: box !== null,
    animate,
    style: box
      ? { transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }
      : { opacity: 0 },
  };
}
