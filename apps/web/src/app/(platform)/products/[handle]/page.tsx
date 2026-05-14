import { DbxShopPage } from "@/components/dbx/StaticPages";

export const dynamic = "force-dynamic";

export default async function ProductHandlePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <DbxShopPage handle={handle} />;
}
