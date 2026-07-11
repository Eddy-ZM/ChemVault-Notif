export type CanonicalProduct = "files" | "lab";

export function canonicalProductUrl(
  product: CanonicalProduct,
  path: string,
  params: Record<string, string | undefined> = {},
): string {
  const origin = product === "files"
    ? process.env.NEXT_PUBLIC_CHEMVAULT_FILES_ORIGIN || "https://file.chemvault.science"
    : process.env.NEXT_PUBLIC_CHEMVAULT_LAB_ORIGIN || "https://lab.chemvault.science";
  const url = new URL(path, origin);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function movedToCanonicalProduct(product: CanonicalProduct, path: string): Response {
  const location = canonicalProductUrl(product, path, { source: "notifications" });
  return Response.json(
    {
      error: "This workflow moved to its authoritative ChemVault product.",
      product,
      location,
    },
    {
      status: 410,
      headers: {
        Location: location,
        Link: `<${location}>; rel="alternate"`,
        Deprecation: "true",
        Sunset: "Thu, 31 Dec 2026 23:59:59 GMT",
      },
    },
  );
}
