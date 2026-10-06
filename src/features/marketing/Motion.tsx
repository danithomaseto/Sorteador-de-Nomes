/**
 * Pequenas animações das páginas de apresentação, todas inspiradas no sorteio. O HTML
 * pré-renderizado já traz o valor final; a animação só acontece no navegador, ao entrar na tela,
 * e nunca com "reduzir movimento".
 */
import { useEffect, useRef } from "react";
import { cx } from "~/components/cx";
import { formatNumber } from "~/utils/format";
import { prefersReducedMotion, useInView } from "~/utils/motion";
import styles from "./Motion.module.css";

const SLOT_EASING = "cubic-bezier(0.16, 0.7, 0.2, 1)";

/**
 * Algarismo que rola como num caça-níquel até parar no valor. A faixa começa no valor (estado
 * final, sem JavaScript) e a animação vem de baixo, passando por outros algarismos.
 */
export function SlotDigit({ value, className }: { value: number; className?: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const stripRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(rootRef, { once: true, threshold: 0.8 });
  const digits = [value, ...[3, 7, 1, 8, 4, 6].map((step) => (value + step) % 10)];

  useEffect(() => {
    const strip = stripRef.current;
    if (!inView || !strip || prefersReducedMotion() || typeof strip.animate !== "function") return;
    strip.animate(
      [
        { transform: `translateY(${String(-(digits.length - 1))}em)` },
        { transform: "translateY(0)" },
      ],
      { duration: 1100 + value * 140, easing: SLOT_EASING, fill: "backwards" },
    );
  }, [digits.length, inView, value]);

  return (
    <span ref={rootRef} className={cx(styles.slot, className)} aria-hidden="true">
      <span ref={stripRef} className={styles.slotStrip}>
        {digits.map((digit, index) => (
          <span key={index}>{digit}</span>
        ))}
      </span>
    </span>
  );
}

/** Número que conta até o valor ao entrar na tela (o leitor de tela recebe só o valor final). */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(rootRef, { once: true, threshold: 0.6 });

  useEffect(() => {
    const element = rootRef.current;
    if (!inView || !element || prefersReducedMotion()) return undefined;
    const duration = 1400;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // Desacelera no fim, como as roletas.
      const eased = 1 - Math.pow(1 - progress, 4);
      element.textContent = formatNumber(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.textContent = formatNumber(value);
    };
  }, [inView, value]);

  return (
    <>
      <span ref={rootRef} className={cx(styles.count, className)} aria-hidden="true">
        {formatNumber(value)}
      </span>
      <span className="visually-hidden">{formatNumber(value)}</span>
    </>
  );
}
