import { RocketShopPage } from "@/components/rocket/StaticPages";

export default async function ProductHandlePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <RocketShopPage handle={handle} />;
}
