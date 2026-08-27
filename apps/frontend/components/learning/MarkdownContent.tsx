'use client';

/**
 * Markdown 本文の描画（react-markdown + GFM + コードハイライト）
 *
 * rehype-raw は使わない（管理APIの保存時点でサニタイズ免除だが、
 * 描画側でも raw HTML は解釈しない二重防御）。
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-body prose prose-gray max-w-none prose-headings:font-bold prose-a:text-[#1e3a8a] prose-a:underline prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-900 prose-pre:text-gray-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
