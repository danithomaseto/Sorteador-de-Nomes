import { cx } from "~/components/cx";
import type { LandingPhoto } from "./photos";
import styles from "./Photo.module.css";

/** Foto real com o tratamento padrão do produto (preto e branco quente, grão sutil). */
export function Photo({ photo, className }: { photo: LandingPhoto; className?: string }) {
  return (
    <figure className={cx(styles.photo, className)}>
      <div className={styles.frame}>
        <img
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading="lazy"
          decoding="async"
        />
      </div>
      {photo.caption ? <figcaption className={styles.caption}>{photo.caption}</figcaption> : null}
    </figure>
  );
}
