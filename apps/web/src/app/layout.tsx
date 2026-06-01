
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata = {
  title: "dBaronX",
  description: "dBaronX commerce, onboarding, and platform access.",
};

export default function RootLayout({ children }: { children: any }) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
