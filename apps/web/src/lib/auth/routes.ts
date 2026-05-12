export function safeLocalPath(value: string | null | undefined, fallback: string) {
  const candidate = (value || "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  try {
    const parsed = new URL(candidate, "https://dbaronx.local");
    if (parsed.origin !== "https://dbaronx.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function preserveAuthSearchParams(
  source: URLSearchParams,
  destinationPath: string,
  keys = ["ref", "invite", "init", "next"],
) {
  const destination = new URL(destinationPath, "https://dbaronx.local");
  for (const key of keys) {
    const value = source.get(key);
    if (value) destination.searchParams.set(key, value);
  }
  return `${destination.pathname}${destination.search}`;
}
