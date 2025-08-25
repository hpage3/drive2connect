/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true, // 👈 ensures Vercel treats it as an App Router project
  },
};

module.exports = nextConfig;
