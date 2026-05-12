import type { ReactNode } from "react";

export const metadata = {
  title: "dBaronX",
  description: "dBaronX commerce, onboarding, and platform access.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
