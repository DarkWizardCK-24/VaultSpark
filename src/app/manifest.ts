import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VaultSpark",
    short_name: "VaultSpark",
    description: "Zero-knowledge password manager with live strength analysis.",
    start_url: "/vault",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05080d",
    theme_color: "#05080d",
    categories: ["security", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
