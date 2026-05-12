/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /pdfjs-dist/,
      type: 'javascript/esm',
    });
    return config;
  },
};

export default nextConfig;