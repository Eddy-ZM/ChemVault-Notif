import { createSupabaseFeatureUpdateStore } from "./feature-update-store";

export interface FeatureUpdateSlugDependencies {
  slugExists?: (slug: string) => Promise<boolean>;
}

export async function generateFeatureUpdateSlug(
  title: string,
  version?: string | null,
  dependencies: FeatureUpdateSlugDependencies = {}
): Promise<string> {
  const base = [title, version]
    .map((part) => normalizeSlugPart(part))
    .filter(Boolean)
    .join("-");
  const root = base || "feature-update";
  const slugExists =
    dependencies.slugExists ??
    ((slug: string) => createSupabaseFeatureUpdateStore().slugExists(slug));

  let candidate = root;
  let suffix = 2;

  while (await slugExists(candidate)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function normalizeSlugPart(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/^v(?=\d)/, "v")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
