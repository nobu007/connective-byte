import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 静的エクスポート設定（Cloudflare Pagesへ直接アップロード。Functionは functions/api/ を参照）
  output: 'export',

  // react-markdown / remark / rehype エコシステム（ESM-only）を transform 対象にする。
  // jest は CJS で動くため必要（next/jest の transformIgnorePatterns は
  // transpilePackages 由来の除外リストのみ上書き可能なため、こちらで指定する）。
  // 実運用上は Next のバンドラが ESM をそのまま扱えるため影響なし。
  // リストは react-markdown+remark-gfm+rehype-highlight の依存クロージャから
  // "type":"module" のパッケージを実測抽出したもの。
  transpilePackages: [
    '@ungap/structured-clone',
    'bail',
    'ccount',
    'character-entities',
    'character-entities-html4',
    'character-entities-legacy',
    'character-reference-invalid',
    'comma-separated-tokens',
    'decode-named-character-reference',
    'devlop',
    'escape-string-regexp',
    'estree-util-is-identifier-name',
    'hast-util-is-element',
    'hast-util-to-jsx-runtime',
    'hast-util-to-text',
    'hast-util-whitespace',
    'html-url-attributes',
    'is-alphabetical',
    'is-alphanumerical',
    'is-decimal',
    'is-hexadecimal',
    'is-plain-obj',
    'longest-streak',
    'lowlight',
    'markdown-table',
    'mdast-util-find-and-replace',
    'mdast-util-from-markdown',
    'mdast-util-gfm',
    'mdast-util-gfm-autolink-literal',
    'mdast-util-gfm-footnote',
    'mdast-util-gfm-strikethrough',
    'mdast-util-gfm-table',
    'mdast-util-gfm-task-list-item',
    'mdast-util-mdx-expression',
    'mdast-util-mdx-jsx',
    'mdast-util-mdxjs-esm',
    'mdast-util-phrasing',
    'mdast-util-to-hast',
    'mdast-util-to-markdown',
    'mdast-util-to-string',
    'micromark',
    'micromark-core-commonmark',
    'micromark-extension-gfm',
    'micromark-extension-gfm-autolink-literal',
    'micromark-extension-gfm-footnote',
    'micromark-extension-gfm-strikethrough',
    'micromark-extension-gfm-table',
    'micromark-extension-gfm-tagfilter',
    'micromark-extension-gfm-task-list-item',
    'micromark-factory-destination',
    'micromark-factory-label',
    'micromark-factory-space',
    'micromark-factory-title',
    'micromark-factory-whitespace',
    'micromark-util-character',
    'micromark-util-chunked',
    'micromark-util-classify-character',
    'micromark-util-combine-extensions',
    'micromark-util-decode-numeric-character-reference',
    'micromark-util-decode-string',
    'micromark-util-encode',
    'micromark-util-html-tag-name',
    'micromark-util-normalize-identifier',
    'micromark-util-resolve-all',
    'micromark-util-sanitize-uri',
    'micromark-util-subtokenize',
    'micromark-util-symbol',
    'micromark-util-types',
    'parse-entities',
    'property-information',
    'react-markdown',
    'rehype-highlight',
    'remark-gfm',
    'remark-parse',
    'remark-rehype',
    'remark-stringify',
    'space-separated-tokens',
    'stringify-entities',
    'trim-lines',
    'trough',
    'unified',
    'unist-util-find-after',
    'unist-util-is',
    'unist-util-position',
    'unist-util-stringify-position',
    'unist-util-visit',
    'unist-util-visit-parents',
    'vfile',
    'vfile-message',
    'zwitch',
  ],

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
