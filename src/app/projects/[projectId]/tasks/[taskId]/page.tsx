import { redirect } from "next/navigation";
import { canonicalProductUrl } from "@/lib/product-boundaries";

export const dynamic = "force-dynamic";

export default async function ProjectTaskCompatibilityRedirect({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  redirect(canonicalProductUrl("lab", "/history", { source: "notifications", projectId, taskId }) as never);
}
