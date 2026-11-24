// Affiliate settings. Fill these in once the AliExpress Portals account is approved.
export const CONFIG = {
  // AliExpress Portals tracking id (aff_fcid / tracking). Empty = plain search links.
  ALIEXPRESS_TRACKING_ID: "",
  BRAND: "Go4FPV",
};

// Builds a "buy" link for a part. Uses part.url when the dataset has a product link,
// otherwise an AliExpress search for brand + name.
export function buyLink(part) {
  const base = part.url || `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(`${part.brand} ${part.name.replace(/\(.*?\)|×4/g, "").trim()}`)}`;
  if (!CONFIG.ALIEXPRESS_TRACKING_ID) return base;
  return base + (base.includes("?") ? "&" : "?") + "aff_fcid=" + encodeURIComponent(CONFIG.ALIEXPRESS_TRACKING_ID);
}
