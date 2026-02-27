import styles from "./Skeleton.module.css";

interface SkeletonProps {
  variant?: "text" | "image" | "card";
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/** A full gallery card skeleton that matches the real card layout */
export function GalleryCardSkeleton() {
  return (
    <article className={styles.cardSkeleton} aria-hidden="true">
      <div className={styles.cardImageSkeleton} />
      <div className={styles.cardBodySkeleton}>
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="70%" />
        <div className={styles.cardMetaSkeleton}>
          <Skeleton variant="text" width="60px" height="20px" />
          <Skeleton variant="text" width="40px" height="20px" />
        </div>
      </div>
    </article>
  );
}

/** Grid of skeleton cards for the gallery loading state */
export function GalleryGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={styles.gridSkeleton}>
      {Array.from({ length: count }).map((_, i) => (
        <GalleryCardSkeleton key={i} />
      ))}
    </div>
  );
}
