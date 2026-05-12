import { redirect } from "next/navigation";

type SigninPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SigninPage({ searchParams }: SigninPageProps) {
  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["ref", "invite", "init", "next"]) {
    const value = resolved?.[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }
  const query = params.toString();
  redirect(`/login${query ? `?${query}` : ""}`);
}
