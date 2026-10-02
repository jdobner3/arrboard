import { ImageResponse } from "next/og";

// The home-screen icon iOS uses when Arrboard is added to the home screen.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const bar = (left: number, top: number, width: number, color: string) => (
    <div style={{ position: "absolute", left, top, width, bottom: 40, borderRadius: 9, background: color }} />
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#11151f", position: "relative", display: "flex" }}>
        {bar(34, 40, 34, "#5b9cff")}
        {bar(79, 62, 34, "#34d399")}
        {bar(124, 84, 22, "#fbbf24")}
      </div>
    ),
    size,
  );
}
