import { redirect } from "next/navigation";
import { canonicalProductUrl } from "@/lib/product-boundaries";

export const dynamic = "force-dynamic";

export default async function ProjectFileCompatibilityRedirect({
  params,
}: {
  params: Promise<{ projectId: string; fileId: string }>;
}) {
  const { projectId, fileId } = await params;
  redirect(canonicalProductUrl("files", "/files", { source: "notifications", projectId, fileId }) as never);
}
