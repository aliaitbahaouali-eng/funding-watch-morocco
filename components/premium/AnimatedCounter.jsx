'use client';
import { useEffect, useRef, useState } from 'react';

/** Compteur qui anime de 0 jusqu'à `value` quand il devient visible. */
export default function AnimatedCounter({ value = 0, duration = 1400, format, suffix = '', prefix = '', className = '' }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started) return;
      started = true;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(value * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  const text = format
    ? format(display)
    : Math.round(display).toLocaleString('fr-FR');

  return <span ref={ref} className={className}>{prefix}{text}{suffix}</span>;
}
