import { DbxShopPage } from "@/components/dbx/StaticPages";

export default async function ProductHandlePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <DbxShopPage handle={handle} />;
}
