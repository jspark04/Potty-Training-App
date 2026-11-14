import { useEffect, useMemo, useState } from 'react';

const BITS = ['⭐', '🎉', '🌟', '🎈', '✨', '💛'];
const CHEERS = ['Way to go', 'You did it', 'High five', 'Superstar'];

export function Celebration({ name }: { name: string }) {
  const [show, setShow] = useState(true);
  const bits = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        char: BITS[i % BITS.length],
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        size: 20 + Math.random() * 22,
        drift: (Math.random() - 0.5) * 120,
      })),
    [],
  );
  const cheer = useMemo(() => CHEERS[Math.floor(Math.random() * CHEERS.length)], []);

  useEffect(() => {
    const id = setTimeout(() => setShow(false), 2400);
    return () => clearTimeout(id);
  }, []);
  if (!show) return null;

  return (
    <div className="party" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            left: `${b.left}%`,
            fontSize: b.size,
            animationDelay: `${b.delay}s`,
            ['--drift' as string]: `${b.drift}px`,
          }}
        >
          {b.char}
        </span>
      ))}
      <div className="party-banner">
        {cheer}
        {name ? `, ${name}` : ''}! ⭐
      </div>
    </div>
  );
}
