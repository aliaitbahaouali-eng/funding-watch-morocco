'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedCounter — compteur SSR-safe avec animation progressive.
 *
 * Fix Sprint 4K-pré-bêta : auparavant, démarrait à 0 puis animait jusqu'à `value`.
 * Bug observé : si l'animation était interrompue (re-render, scroll, freeze RAF),
 * elle pouvait rester bloquée à une valeur intermédiaire (ex 3 sur 35).
 *
 * Nouvelle approche :
 *   1. Affiche TOUJOURS la valeur finale en SSR + initial render (correct par défaut).
 *   2. Si l'élément n'a JAMAIS été visible côté client, replay l'animation 0→value
 *      comme enhancement. Sinon laisse la valeur stable.
 *   3. Si une valeur change post-mount (refresh data), saute direct à la nouvelle
 *      valeur sans animation, pour éviter des freezes intermédiaires.
 */
export default function AnimatedCounter({ value = 0, duration = 1200, format, suffix = '', prefix = '', className = '' }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(value);
  const animatedOnceRef = useRef(false);
  const valueRef = useRef(value);

  useEffect(() => {
    // Si la valeur change après l'animation initiale, on saute direct (pas d'anim)
    if (animatedOnceRef.current && value !== valueRef.current) {
      valueRef.current = value;
      setDisplay(value);
      return;
    }
    valueRef.current = value;

    const el = ref.current;
    if (!el || animatedOnceRef.current) return;

    // Trigger animation seulement quand l'élément devient visible
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || animatedOnceRef.current) return;
      animatedOnceRef.current = true;

      // On démarre l'animation depuis 0
      setDisplay(0);
      const start = performance.now();
      let rafId;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(value * eased);
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          // Garantir la valeur finale exacte
          setDisplay(value);
        }
      };
      rafId = requestAnimationFrame(tick);

      // Cleanup si l'élément disparaît avant la fin
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        setDisplay(value);
      };
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  const text = format
    ? format(display)
    : Math.round(display).toLocaleString('fr-FR');

  return <span ref={ref} className={className}>{prefix}{text}{suffix}</span>;
}
