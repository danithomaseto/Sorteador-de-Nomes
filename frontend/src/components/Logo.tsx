import { APP_NAME } from "~/lib/config";
import styles from "./Logo.module.css";

/** Marca: canhoto de bilhete (símbolo tradicional de sorteio) + nome. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 24"
      width={(size * 32) / 24}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 3h24a2 2 0 0 1 2 2v3.5a3.5 3.5 0 0 0 0 7V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3.5a3.5 3.5 0 0 0 0-7V5a2 2 0 0 1 2-2Z"
        fill="#F2B300"
        stroke="#1B1A17"
        strokeWidth="1.5"
      />
      <path d="M21 5.5v13" stroke="#1B1A17" strokeWidth="1.5" strokeDasharray="1.5 2" />
      <path d="M9 9.5h7M9 13.5h4.5" stroke="#1B1A17" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className={styles.logo}>
      <LogoMark />
      <span className={styles.word}>{APP_NAME}</span>
    </span>
  );
}
