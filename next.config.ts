import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Whitelist LAN / device-on-Wi-Fi origins so HMR works when the template is
  // opened from a phone or from the Eazo Mobile WebView. Next 15+ blocks
  // cross-origin dev resources by default; we widen it to the local subnets
  // most laptops hand out (192.168.*, 10.*, 172.16-31.*) plus localhost.
  // Production builds are unaffected (this only governs `next dev`).
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
  ],
};

export default nextConfig;
