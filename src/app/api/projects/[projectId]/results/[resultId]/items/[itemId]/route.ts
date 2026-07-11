import { movedToCanonicalProduct } from "@/lib/product-boundaries";
export async function PATCH() { return movedToCanonicalProduct("lab", "/history"); }
