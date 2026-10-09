import withPWAInit from "@ducanh2912/next-pwa";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(self), display-capture=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
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
