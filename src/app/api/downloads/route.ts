import { handle } from "@/lib/server/services";
import { downloadAction, getDownloads, type DownloadAction } from "@/lib/server/ops";

export async function GET() {
  return handle(getDownloads);
}

export async function POST(req: Request) {
  return handle(async () => downloadAction((await req.json()) as DownloadAction));
}
