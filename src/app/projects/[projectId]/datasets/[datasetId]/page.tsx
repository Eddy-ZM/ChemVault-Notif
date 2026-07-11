import { redirect } from "next/navigation";
import { canonicalProductUrl } from "@/lib/product-boundaries";

export const dynamic = "force-dynamic";

export default async function ProjectDatasetCompatibilityRedirect({
  params,
}: {
  params: Promise<{ projectId: string; datasetId: string }>;
}) {
  const { projectId, datasetId } = await params;
  redirect(canonicalProductUrl("lab", "/history", { source: "notifications", projectId, datasetId }) as never);
}
