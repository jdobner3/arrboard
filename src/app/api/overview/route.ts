import { handle } from "@/lib/server/services";
import { getOverview } from "@/lib/server/ops";

export async function GET() {
  return handle(getOverview);
}
