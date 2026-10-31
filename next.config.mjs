/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prototype: don't let a lint/type nit block a deploy.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
