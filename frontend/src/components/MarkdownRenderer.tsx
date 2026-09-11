import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Shared component for rendering AI-generated markdown output.
 * Converts **bold**, *italic*, `code`, lists, tables, etc.
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none
      prose-p:leading-relaxed prose-p:my-1.5
      prose-headings:font-bold prose-headings:text-neutral-900 dark:prose-headings:text-white
      prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
      prose-strong:text-neutral-900 dark:prose-strong:text-white prose-strong:font-semibold
      prose-em:text-neutral-700 dark:prose-em:text-neutral-300
      prose-code:bg-neutral-100 dark:prose-code:bg-neutral-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px] prose-code:font-mono prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-900 prose-pre:rounded-xl prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-700
      prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
      prose-li:marker:text-indigo-500
      prose-blockquote:border-l-indigo-400 prose-blockquote:text-neutral-600 dark:prose-blockquote:text-neutral-400
      prose-hr:border-neutral-200 dark:prose-hr:border-neutral-700
      prose-table:text-sm
      prose-th:bg-neutral-100 dark:prose-th:bg-neutral-800
      ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
