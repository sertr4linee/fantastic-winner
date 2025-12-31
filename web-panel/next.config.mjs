/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permettre les connexions WebSocket locales
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;
