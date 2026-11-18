import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// One family in two widths: condensed for titles and numbers (trail signs, club kit), normal for reading.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: { default: "Nakuru Walk", template: "%s | Nakuru Walk" },
  description: "Nakuru Walk Movement: this weekend's walk, the club feed, the Wednesday market, and your own walking record.",
  appleWebApp: { capable: true, title: "Nakuru Walk", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f1f4f2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Keep Chrome's install offer for the Install button; it can arrive before React loads.
const installScript = `window.__install=null;addEventListener("beforeinstallprompt",function(e){window.__install=e;dispatchEvent(new Event("install-ready"))});`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-KE" className={`${archivo.variable} antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: installScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
