/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/supabase/:path*',
        destination: 'https://zhchuypwwhgqzofrknsq.supabase.co/:path*',
      },
    ];
  },
};

export default nextConfig;
