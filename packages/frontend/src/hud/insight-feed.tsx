import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

/** Typewriter feed of insight lines, cycling every few seconds. */
export function InsightFeed({ lines }: { lines: string[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState({ text: '', n: 0 });
  const current = lines.length ? lines[index % lines.length]! : '';
  const shownChars = reduce ? current.length : typed.text === current ? typed.n : 0;

  useEffect(() => {
    if (!current) return;
    if (reduce) {
      const t = setTimeout(() => setIndex((i) => i + 1), 5000);
      return () => clearTimeout(t);
    }
    let n = 0;
    const iv = setInterval(() => {
      n += 1;
      setTyped({ text: current, n });
      if (n >= current.length) clearInterval(iv);
    }, 22);
    const next = setTimeout(() => setIndex((i) => i + 1), current.length * 22 + 3800);
    return () => {
      clearInterval(iv);
      clearTimeout(next);
    };
  }, [current, reduce]);

  if (!lines.length) return <p className="hud-hint">Waiting for data…</p>;
  const history = Array.from({ length: Math.min(3, lines.length - 1) }, (_, k) => lines[(index - k - 1 + lines.length * 4) % lines.length]!).reverse();

  return (
    <div className="hud-mono flex h-full flex-col justify-end gap-200" style={{ fontSize: 13, lineHeight: 1.45 }} aria-live="polite">
      {history.map((l, i) => (
        <p key={`${index}-${i}`} style={{ color: 'var(--hud-dim)', opacity: 0.45 + i * 0.2 }}>&gt; {l}</p>
      ))}
      <p style={{ color: 'var(--hud-ink)' }}>
        <span style={{ color: 'var(--hud-s1)' }}>&gt; </span>
        {current.slice(0, shownChars)}
        <span className="hud-dot-live ml-100 inline-block align-middle" style={{ width: 9, height: 15, borderRadius: 0, background: 'var(--hud-s1)', boxShadow: '0 0 8px var(--hud-s1)' }} />
      </p>
    </div>
  );
}
