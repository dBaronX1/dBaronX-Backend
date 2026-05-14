#!/usr/bin/env node

const TARGET_TITLE = "Men's Cotton Linen Long Sleeve Casual Shirt";
const TARGET_HANDLE = "mens-cotton-linen-long-sleeve-casual-shirt";

function cleanBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function envValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return "";
}

function containsTarget(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value || "");
  return text.includes(TARGET_TITLE) || text.includes(TARGET_HANDLE);
}

function extractProducts(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const nested = root.data && typeof root.data === "object" ? root.data : root;
  for (const key of ["products", "items", "data"]) {
    if (Array.isArray(nested[key])) return nested[key].filter((item) => item && typeof item === "object");
  }
  return nested.product && typeof nested.product === "object" ? [nested.product] : [];
}

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, { ...options, cache: "no-store" });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, text, json, error: null };
  } catch (error) {
    return { ok: false, status: 0, text: "", json: null, error: error instanceof Error ? error.message : String(error) };
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url, { headers: { accept: "text/html,application/xhtml+xml" }, cache: "no-store" });
    const text = await response.text().catch(() => "");
    return { ok: response.ok, status: response.status, text, error: null };
  } catch (error) {
    return { ok: false, status: 0, text: "", error: error instanceof Error ? error.message : String(error) };
  }
}

function productVisible(products) {
  return products.some((product) => product?.handle === TARGET_HANDLE || product?.title === TARGET_TITLE || containsTarget(product));
}

async function main() {
  const medusaBaseUrl = cleanBaseUrl(envValue("MEDUSA_BASE_URL", "MEDUSA_BACKEND_URL", "NEXT_PUBLIC_MEDUSA_BACKEND_URL"));
  const publishableKey = envValue("MEDUSA_PUBLISHABLE_KEY", "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");
  const webBaseUrl = cleanBaseUrl(envValue("WEB_BASE_URL", "NEXT_PUBLIC_SITE_URL", "SITE_URL"));
  const blockers = [];

  if (!medusaBaseUrl) blockers.push("MEDUSA_BASE_URL is missing");
  if (!publishableKey) blockers.push("MEDUSA_PUBLISHABLE_KEY is missing");
  if (!webBaseUrl) blockers.push("WEB_BASE_URL is missing");

  let publishableKeyAccepted = false;
  let medusaProductVisible = false;
  let webApiProductVisible = false;
  let homeProductVisible = false;
  let shopProductVisible = false;
  let productsPageVisible = false;
  let productDetailVisible = false;

  if (medusaBaseUrl && publishableKey) {
    const headers = { accept: "application/json", "x-publishable-api-key": publishableKey };
    const allUrl = `${medusaBaseUrl}/store/products?limit=20`;
    const handleUrl = `${medusaBaseUrl}/store/products?handle=${encodeURIComponent(TARGET_HANDLE)}&limit=5`;
    const [all, byHandle] = await Promise.all([fetchJson(allUrl, { headers }), fetchJson(handleUrl, { headers })]);
    publishableKeyAccepted = all.ok || byHandle.ok;
    if (!publishableKeyAccepted) blockers.push(`Medusa rejected or did not answer product requests (list=${all.status}, handle=${byHandle.status})`);
    medusaProductVisible = productVisible(extractProducts(all.json)) || productVisible(extractProducts(byHandle.json)) || containsTarget(all.text) || containsTarget(byHandle.text);
    if (publishableKeyAccepted && !medusaProductVisible) blockers.push(`Medusa Store product is not visible for handle ${TARGET_HANDLE}`);
  }

  if (webBaseUrl) {
    const webApi = await fetchJson(`${webBaseUrl}/api/store/products?handle=${encodeURIComponent(TARGET_HANDLE)}`, { headers: { accept: "application/json" } });
    if (webApi.status !== 404) {
      webApiProductVisible = webApi.ok && (productVisible(extractProducts(webApi.json)) || containsTarget(webApi.text));
      if (!webApiProductVisible) blockers.push(`Web product API exists but does not expose ${TARGET_HANDLE} (status=${webApi.status})`);
    }

    const [home, shop, products, detail] = await Promise.all([
      fetchText(`${webBaseUrl}/home`),
      fetchText(`${webBaseUrl}/shop`),
      fetchText(`${webBaseUrl}/products`),
      fetchText(`${webBaseUrl}/products/${TARGET_HANDLE}`),
    ]);

    homeProductVisible = home.ok && containsTarget(home.text);
    shopProductVisible = shop.ok && containsTarget(shop.text);
    productsPageVisible = products.ok && containsTarget(products.text);
    productDetailVisible = detail.ok && containsTarget(detail.text);

    for (const [label, result] of [["/home", home], ["/shop", shop], ["/products", products], [`/products/${TARGET_HANDLE}`, detail]]) {
      if (!result.ok) blockers.push(`${label} did not return a customer page (status=${result.status})`);
      if (/Cannot GET|medusa_store_env_missing|Store API|backend blocker|runtime auth|Rocket internal labels/i.test(result.text)) {
        blockers.push(`${label} exposes internal/runtime wording`);
      }
    }
  }

  const staleFrontendBuildLikely = Boolean(medusaProductVisible && (!shopProductVisible || !productsPageVisible || !productDetailVisible));
  if (staleFrontendBuildLikely) blockers.push("Medusa product is visible but one or more web pages do not render it; redeploy web with current env/build.");

  const success = blockers.length === 0 && medusaProductVisible && publishableKeyAccepted && shopProductVisible && productsPageVisible && productDetailVisible;
  const nextManualStep = success
    ? "Proceed to checkout smoke and first transaction validation."
    : staleFrontendBuildLikely
      ? "Redeploy Rocket/Fly web with MEDUSA_BASE_URL and the stable MEDUSA_PUBLISHABLE_KEY, then rerun this smoke."
      : !medusaProductVisible
        ? "Verify the CJ shirt is published in Medusa sales channel and accessible with the stable publishable key."
        : "Fix the listed blockers, then rerun this smoke.";

  console.log(JSON.stringify({
    success,
    blockers,
    medusaProductVisible,
    webApiProductVisible,
    homeProductVisible,
    shopProductVisible,
    productsPageVisible,
    productDetailVisible,
    staleFrontendBuildLikely,
    publishableKeyAccepted,
    nextManualStep,
  }, null, 2));

  if (!success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
