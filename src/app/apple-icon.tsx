import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The home-screen icon iOS uses when Arrboard is added to the home screen: the same Jolly Roger as icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"), "utf8");
  // iOS rounds the corners itself, so fill the whole square
  const square = svg.replace('rx="14"', 'rx="0"');
  const src = `data:image/svg+xml;base64,${Buffer.from(square).toString("base64")}`;
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      <img src={src} width={180} height={180} />
    ),
    size,
  );
}
