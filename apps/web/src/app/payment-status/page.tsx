import { DbxSimplePage } from "@/components/dbx/StaticPages";

export const dynamic = "force-dynamic";

export default function PaymentStatusPage() {
  return <DbxSimplePage title="Payment status" description="Check safe payment progress without changing paid status."><p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Payment status is confirmed by the payment service after secure verification. This page does not mark orders paid.</p></DbxSimplePage>;
}
