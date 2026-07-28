import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    navigateFallback: "/offline",
  },
});

export default withPWA(nextConfig);
