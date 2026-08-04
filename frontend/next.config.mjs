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

  fallbacks: {
    document: "/offline",
  },

  disable: process.env.NODE_ENV === "development",
});

export default withPWA(nextConfig);