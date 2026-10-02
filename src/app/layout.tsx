import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TabBar } from "@/components/TabBar";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: "Arrboard",
  description: "Control Sonarr, Radarr, Lidarr, Seerr, SABnzbd, Prowlarr and Bazarr from your phone.",
  appleWebApp: { capable: true, title: "Arrboard", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
    { media: "(prefers-color-scheme: light)", color: "#f2f3f7" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full pb-[calc(env(safe-area-inset-bottom)+3.5rem)]">
        <ToastProvider>
          {children}
          <TabBar />
        </ToastProvider>
      </body>
    </html>
  );
}
