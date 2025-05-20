/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.lite.usercontent.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fallback configuration
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Add support for blob URLs
    config.module.rules.push({
      test: /\.blob$/,
      type: 'asset/resource',
    });

    // Simpler optimization configuration
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          pdf: {
            test: /[\\/]node_modules[\\/](jspdf|jspdf-autotable)[\\/]/,
            name: 'pdf-libs',
            priority: 10,
          },
        },
      };
    }

    return config;
  },
}

export default nextConfig
