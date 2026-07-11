import { NextRequest, NextResponse } from "next/server";
import { hasValidLifecycleKey } from "@/lib/api/internal-key";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface LifecycleBody {
  action?: "export" | "delete";
  requestId?: string;
}

interface ProjectFileExport {
  storage_bucket?: unknown;
  storage_path?: unknown;
}

export async function POST(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  if (!(await hasValidLifecycleKey(request))) {
    return NextResponse.json({ error: "Invalid lifecycle service credential." }, { status: 401 });
  }

  const { userId } = await context.params;
  const body = (await request.json().catch(() => null)) as LifecycleBody | null;
  if (!userId || !body || (body.action !== "export" && body.action !== "delete")) {
    return NextResponse.json({ error: "User id and lifecycle action are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const exported = await supabase.rpc("export_user_lifecycle_data", { subject_user_id: userId });
  if (exported.error) {
    return NextResponse.json({ error: exported.error.message }, { status: 500 });
  }

  if (body.action === "export") {
    return NextResponse.json({
      ok: true,
      service: "notifications",
      requestId: body.requestId || null,
      data: exported.data,
    });
  }

  const exportObject = exported.data && typeof exported.data === "object" && !Array.isArray(exported.data) ? exported.data : {};
  const projectFiles = "projectFiles" in exportObject && Array.isArray(exportObject.projectFiles)
    ? (exportObject.projectFiles as ProjectFileExport[])
    : [];
  const objectsByBucket = new Map<string, string[]>();
  for (const file of projectFiles) {
    if (typeof file.storage_bucket !== "string" || typeof file.storage_path !== "string") continue;
    const paths = objectsByBucket.get(file.storage_bucket) || [];
    paths.push(file.storage_path);
    objectsByBucket.set(file.storage_bucket, paths);
  }

  let objectsDeleted = 0;
  for (const [bucket, paths] of objectsByBucket) {
    for (let offset = 0; offset < paths.length; offset += 1000) {
      const batch = paths.slice(offset, offset + 1000);
      const removed = await supabase.storage.from(bucket).remove(batch);
      if (removed.error) {
        return NextResponse.json({ error: `Storage cleanup failed: ${removed.error.message}` }, { status: 502 });
      }
      objectsDeleted += batch.length;
    }
  }

  const deleted = await supabase.rpc("delete_user_lifecycle_data", { subject_user_id: userId });
  if (deleted.error) {
    return NextResponse.json({ error: deleted.error.message }, { status: 500 });
  }
  const deletedData = deleted.data && typeof deleted.data === "object" && !Array.isArray(deleted.data) ? deleted.data : {};

  return NextResponse.json({
    ok: true,
    service: "notifications",
    requestId: body.requestId || null,
    deleted: { ...deletedData, objectsDeleted },
  });
}
