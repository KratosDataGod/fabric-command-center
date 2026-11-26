import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { brand, brandAsset } from '@/config';

const LINES = [
  [brand.name, brand.titleAccent].filter(Boolean).join(' ').toUpperCase(),
  ...(brand.copy?.boot ?? ['ESTABLISHING FABRIC LINK ............ OK', 'ALL SYSTEMS NOMINAL.']),
];

/** Short start-up sequence on first load. Skipped when reduced motion is on. */
export function Boot() {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(Boolean(reduce));
  useEffect(() => {
    if (reduce) return;
    const timers = LINES.map((_, i) => setTimeout(() => setShown(i + 1), 160 + i * 240));
    timers.push(setTimeout(() => setDone(true), 160 + LINES.length * 240 + 420));
    return () => timers.forEach(clearTimeout);
  }, [reduce]);
  const logo = brandAsset(brand.logo);

  return (
    <AnimatePresence>
      {done ? null : (
        <motion.div className="hud-boot" exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }} transition={{ duration: 0.45 }} aria-hidden>
          <div style={{ width: 'min(560px, 86vw)' }}>
            {logo ? <img src={logo} alt="" style={{ height: 40, marginBottom: 18 }} /> : null}
            {LINES.slice(0, shown).map((l, i) => (
              <motion.p
                key={`${i}-${l}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ fontSize: 14, lineHeight: 2, color: i === LINES.length - 1 ? 'var(--fcc-hud-sun)' : '#bff6ff', textShadow: '0 0 8px color-mix(in srgb, var(--fcc-hud-s1) 60%, transparent)' }}
              >
                &gt; {l}
              </motion.p>
            ))}
            <div style={{ marginTop: 14, height: 3, background: 'color-mix(in srgb, var(--fcc-hud-s1) 15%, transparent)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: LINES.length * 0.24 + 0.3, ease: 'easeInOut' }}
                style={{ height: '100%', background: 'linear-gradient(90deg, var(--fcc-hud-s0), var(--fcc-hud-s1), var(--fcc-hud-hot))' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
