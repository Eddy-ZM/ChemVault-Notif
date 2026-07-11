import { redirect } from "next/navigation";
import { canonicalProductUrl } from "@/lib/product-boundaries";

export const dynamic = "force-dynamic";

export default async function ProjectFilesCompatibilityRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(canonicalProductUrl("files", "/files", { source: "notifications", projectId }) as never);
}
