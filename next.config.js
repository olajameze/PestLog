import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  turbopack: {},
  reactStrictMode: true,
  images: { 
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jgdev.org',
      },
    ],
  }
};

export default withPWA(nextConfig);