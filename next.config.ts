import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 名片頁的大頭照如果放外部網址（例如 CDN），把網域加進來
  images: { remotePatterns: [] },

  async rewrites() {
    return {
      // beforeFiles：比檔案路由更早判斷，確保根目錄一定顯示官網
      beforeFiles: [
        // 網址根目錄 / → 官網（public/home.html，完整保留原本的 SEO 標籤）
        { source: "/", destination: "/home.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
