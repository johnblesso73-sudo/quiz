/** Decorative depth layer: aurora gradients, grid, noise and floating 3D solids. */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 surface-aurora" />
      <div className="absolute inset-0 bg-grid opacity-70" />
      <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />

      <div className="depth-scene absolute inset-0">
        <div className="animate-float-slow absolute -left-16 top-24 h-56 w-56 rounded-[2.5rem] bg-primary/25 blur-2xl" />
        <div
          className="animate-drift absolute right-[6%] top-[12%] h-40 w-40 rounded-[2rem] border border-glass-border bg-glass shadow-[var(--shadow-depth)]"
          style={{ transform: "rotateX(24deg) rotateY(-28deg)" }}
        />
        <div
          className="animate-float-slow absolute bottom-[14%] left-[10%] h-28 w-28 rounded-full border border-glass-border bg-accent/15 blur-[2px]"
          style={{ animationDelay: "-4s" }}
        />
        <div
          className="animate-drift absolute bottom-[8%] right-[14%] h-32 w-32 rounded-3xl bg-primary/20 blur-xl"
          style={{ animationDelay: "-7s" }}
        />
      </div>
    </div>
  );
}
