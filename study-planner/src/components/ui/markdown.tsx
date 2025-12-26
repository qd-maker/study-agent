'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface MarkdownRendererProps {
    content: string
    className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`prose prose-sm max-w-none dark:prose-invert 
      prose-headings:text-foreground prose-headings:font-semibold
      prose-p:text-foreground prose-p:leading-relaxed
      prose-strong:text-foreground prose-strong:font-semibold
      prose-ul:text-foreground prose-ol:text-foreground
      prose-li:marker:text-muted-foreground
      prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
      prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg
      prose-blockquote:border-l-violet-500 prose-blockquote:text-muted-foreground
      ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
