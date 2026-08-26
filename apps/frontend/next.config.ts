import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 静的エクスポート設定（Cloudflare Pagesへ直接アップロード。Functionは functions/api/ を参照）
  output: 'export',

  // 画像最適化の無効化（静的エクスポート時は必須）
  images: {
    unoptimized: true,
  },

  // トレーリングスラッシュの設定
  trailingSlash: true,

  // 開発環境でのAPIプロキシ設定（本番では不要）
  // 静的エクスポート時はrewritesは使用できないため、開発時のみ有効化
  ...(process.env.NODE_ENV === 'development' && {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ];
    },
  }),
};

export default nextConfig;
