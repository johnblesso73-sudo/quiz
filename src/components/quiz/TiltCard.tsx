import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  intensity?: number;
};

/** Glass card with restrained pointer-driven 3D tilt (disabled for reduced motion / touch). */
export function TiltCard({ children, className, intensity = 6 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>("");

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      ref={ref}
      onPointerMove={(event) => {
        if (reduced || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        setTransform(
          `rotateX(${(-y * intensity).toFixed(2)}deg) rotateY(${(x * intensity).toFixed(2)}deg) translateZ(6px)`,
        );
      }}
      onPointerLeave={() => setTransform("")}
      className={cn("tilt-card surface-glass rounded-3xl", className)}
      style={{ transform }}
    >
      {children}
    </div>
  );
}
