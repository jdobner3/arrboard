import { handle, BadRequest } from "@/lib/server/services";
import { getIndexers, setIndexerEnabled, testIndexers } from "@/lib/server/ops";

export async function GET() {
  return handle(getIndexers);
}

// { action: "test", id? }  or  { action: "enable", id, enable }
export async function POST(req: Request) {
  return handle(async () => {
    const { action, id, enable } = await req.json();
    if (action === "test") return testIndexers(id === undefined ? undefined : Number(id));
    if (action === "enable" && Number.isInteger(id)) return setIndexerEnabled(id, Boolean(enable));
    throw new BadRequest("Bad request");
  });
}
