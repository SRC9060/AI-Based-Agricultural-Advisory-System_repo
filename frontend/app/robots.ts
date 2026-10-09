import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://ai-based-agricultural-advisory-syst-liard.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/offline"],
      disallow: [
        "/dashboard",
        "/chat",
        "/profile",
        "/settings",
        "/disease-detection",
        "/weather",
        "/market-prices",
        "/schemes",
        "/queries",
        "/feedback",
        "/my-farm",
        "/admin",
        "/admin/*",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
