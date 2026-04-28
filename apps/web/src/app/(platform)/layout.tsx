import { OpsNav } from "@/components/platform/OpsNav";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <OpsNav />
        <main id="main-content">{children}</main>
      </div>
    </div>
  );
}
