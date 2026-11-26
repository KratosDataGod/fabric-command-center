import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { brand } from '@/config';

/** Comic-style "LOCKED ON" sticker that pops when a new filter is selected. */
export function LockBurst({ burst }: { burst: { id: number; label: string; value: string } | null }) {
  const reduce = useReducedMotion();
  const points = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r = i % 2 === 0 ? 100 : 74;
    return `${110 + Math.cos(a) * r * 1.35},${110 + Math.sin(a) * r * 0.9}`;
  }).join(' ');
  return (
    <div className="pointer-events-none fixed right-[3vw] top-[12vh] z-50" aria-live="polite">
      <AnimatePresence>
        {burst ? (
          <motion.div
            key={burst.id}
            initial={reduce ? { opacity: 0 } : { scale: 0.2, rotate: -25, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { scale: 1, rotate: -8, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { scale: 1.3, opacity: 0, rotate: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16 }}
            style={{ width: 300, height: 220 }}
          >
            <svg viewBox="-40 0 300 220" width="300" height="220" aria-hidden>
              <defs>
                <pattern id="burst-dots" width="7" height="7" patternUnits="userSpaceOnUse">
                  <circle cx="3.5" cy="3.5" r="1.6" fill="#ff2e88" />
                </pattern>
              </defs>
              <polygon points={points} fill="#14121c" transform="translate(6 6)" />
              <polygon points={points} fill="#ffd23f" stroke="#14121c" strokeWidth="4" />
              <polygon points={points} fill="url(#burst-dots)" opacity="0.5" />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center" style={{ transform: 'translateX(-6px)' }}>
              <div>
                <div style={{ fontFamily: 'var(--hud-comic)', fontSize: 36, lineHeight: 1, color: '#14121c', letterSpacing: '0.04em', textShadow: '3px 3px 0 #ff2e88' }}>
                  {brand.copy?.lockOn ?? 'LOCKED ON!'}
                </div>
                <div style={{ fontFamily: 'var(--hud-comic)', fontSize: 22, color: '#14121c', marginTop: 4, maxWidth: 200 }}>
                  {burst.label}: {burst.value}
                </div>
              </div>
            </div>
            <span className="sr-only">Filtered by {burst.label} {burst.value}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
