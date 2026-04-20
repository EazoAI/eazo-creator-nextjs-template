import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // In E2B sandbox, use auto:// so HMR WebSocket inherits the page protocol (wss for https)
      config.devServer = {
        ...config.devServer,
        client: {
          webSocketURL: "auto://0.0.0.0:0/_next/webpack-hmr",
        },
      };
      // E2B uses Firecracker VMs where inotify can be unreliable; fall back to polling
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
