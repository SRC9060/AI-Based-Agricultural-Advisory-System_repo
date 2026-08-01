import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  // A document fallback is used only when both the network and cache miss.
  // Workbox's `navigateFallback` is an SPA navigation handler and would serve
  // /offline for every route, including /login and /dashboard while online.
  fallbacks: {
    document: "/offline",
  },
  disable: process.env.NODE_ENV === "development",
});

export default withPWA(nextConfig);
