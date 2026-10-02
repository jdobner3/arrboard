import type { NextRequest } from "next/server";
import { handle } from "@/lib/server/services";
import { getCalendar } from "@/lib/server/ops";

export async function GET(req: NextRequest) {
  const days = Math.min(60, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 14));
  return handle(() => getCalendar(days));
}
