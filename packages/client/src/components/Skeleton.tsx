interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-sys-fill rounded ${className}`}
      aria-hidden="true"
    />
  );
}
