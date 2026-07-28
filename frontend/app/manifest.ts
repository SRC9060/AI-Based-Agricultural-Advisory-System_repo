import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgriAdvisor - Farmer Voice Assistant",
    short_name: "AgriAdvisor",
    description: "Voice-first crop, weather, market and scheme advice for farmers.",
    start_url: "/chat",
    display: "standalone",
    background_color: "#f3fbef",
    theme_color: "#1f7a35",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/agriadvisor-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/agriadvisor-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
