import Link from 'next/link';

export default function CampaignButton() {
  return (
    <Link
      href="/dreams"
      className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-cyan-500 text-white px-10 py-5 rounded-3xl text-2xl font-bold shadow-2xl hover:scale-110 transition flex items-center gap-3 z-50"
    >
      🌍 JOIN dBaronX DREAMS — Back Real Projects
    </Link>
  );
}
