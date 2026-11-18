import type { MetadataRoute } from "next";

/* What phones use to install the app: name, colours, icons, and that it opens full screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nakuru Walk",
    short_name: "Nakuru Walk",
    description: "Nakuru Walk Movement: the next walk, who's coming, and your own walking record.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f4f2",
    theme_color: "#f1f4f2",
    lang: "en-KE",
    categories: ["health", "lifestyle", "sports"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
