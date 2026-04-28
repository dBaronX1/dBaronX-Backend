import Link from 'next/link';

export default function DeliveryTrackerButton() {
  return (
    <Link
      href="/track"
      className="fixed bottom-24 right-8 bg-emerald-600 text-white px-8 py-4 rounded-3xl text-xl font-bold shadow-xl hover:scale-105 transition flex items-center gap-3 z-50"
    >
      📦 Track My Delivery (Farm → Door)
    </Link>
  );
}
