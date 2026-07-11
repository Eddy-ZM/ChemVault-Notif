import { movedToCanonicalProduct } from "@/lib/product-boundaries";
export async function POST() { return movedToCanonicalProduct("lab", "/history"); }
