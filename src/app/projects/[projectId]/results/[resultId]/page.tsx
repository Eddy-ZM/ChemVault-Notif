import { redirect } from "next/navigation";
import { canonicalProductUrl } from "@/lib/product-boundaries";

export const dynamic = "force-dynamic";

export default async function ProjectResultCompatibilityRedirect({
  params,
}: {
  params: Promise<{ projectId: string; resultId: string }>;
}) {
  const { projectId, resultId } = await params;
  redirect(canonicalProductUrl("lab", `/result/${encodeURIComponent(resultId)}`, { source: "notifications", projectId }) as never);
}
