import type { ReactNode } from "react";

interface SurfaceSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SurfaceSection({
  title,
  description,
  children,
}: SurfaceSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-neutral-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
