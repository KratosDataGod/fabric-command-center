import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/** Rolls a number from its previous value to the new one, like a HUD readout. */
export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) {
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce]);
  return <span className={className}>{format(reduce ? value : shown)}</span>;
}
