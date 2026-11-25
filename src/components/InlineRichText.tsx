import React from 'react';
import { parseInlineRichText } from '../lib/variables';
import { renderLatexToHtml } from '../lib/math';

interface InlineRichTextProps {
  text: string;
  variables: Record<string, string>;
  showRawTokens: boolean;
  className?: string;
}

export const InlineRichText: React.FC<InlineRichTextProps> = ({
  text,
  variables,
  showRawTokens,
  className,
}) => {
  const tokens = parseInlineRichText(text, variables, showRawTokens);

  return (
    <span className={className}>
      {tokens.map((tok, idx) => {
        switch (tok.kind) {
          case 'bold':
            return (
              <strong key={idx} className="font-semibold text-slate-900">
                {tok.content}
              </strong>
            );
          case 'italic':
            return (
              <em key={idx} className="italic">
                {tok.content}
              </em>
            );
          case 'code':
            return (
              <code
                key={idx}
                className="font-mono text-[0.87em] bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded border border-slate-200/80"
              >
                {tok.content}
              </code>
            );
          case 'math': {
            const rendered = renderLatexToHtml(tok.content, false);
            return (
              <span
                key={idx}
                title={rendered.error ? `LaTeX error: ${rendered.error}` : `$${tok.content}$`}
                className="inline-block align-baseline px-0.5"
                dangerouslySetInnerHTML={{ __html: rendered.html }}
              />
            );
          }
          case 'varResolved':
            return (
              <span
                key={idx}
                title={`Resolves to: ${variables[tok.rawKey || ''] || ''}`}
                className="font-mono text-[0.86em] bg-blue-50 text-blue-700 px-1 py-0.5 rounded border border-blue-200"
              >
                {tok.content}
              </span>
            );
          case 'varMissing':
            return (
              <span
                key={idx}
                title="Undefined variable — define it in Course Setup → Variables"
                className="font-mono text-[0.86em] bg-amber-50 text-amber-800 px-1 py-0.5 rounded border border-amber-300"
              >
                {tok.content}
              </span>
            );
          default:
            return <React.Fragment key={idx}>{tok.content}</React.Fragment>;
        }
      })}
    </span>
  );
};
