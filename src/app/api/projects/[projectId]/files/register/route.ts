import { movedToCanonicalProduct } from "@/lib/product-boundaries";

export const dynamic = "force-dynamic";

export async function POST() {
  return movedToCanonicalProduct("files", "/files");
}
