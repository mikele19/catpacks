/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = {
  headers() {
    return [
      {
        source: "/ui/:path*",
        headers: [
          {key: "Cache-Control", value: "no-store"},
        ],
      },
    ];
  },
};
