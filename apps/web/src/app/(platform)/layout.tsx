import type { ReactNode } from "react";
import { OpsNav } from "@/components/platform/OpsNav";

export default function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <OpsNav />
        {children}
      </div>
    </div>
  );
}
