import type { NextRequest } from "next/server";
import { handle, BadRequest } from "@/lib/server/services";
import { getRequests, requestAction } from "@/lib/server/ops";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  return handle(() => getRequests(p.get("filter") ?? "pending", Math.max(1, Number(p.get("page")) || 1)));
}

export async function POST(req: Request) {
  return handle(async () => {
    const { id, action } = await req.json();
    if (!Number.isInteger(id) || (action !== "approve" && action !== "decline")) throw new BadRequest("Bad request");
    return requestAction(id, action);
  });
}
