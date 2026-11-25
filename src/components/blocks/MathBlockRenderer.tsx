import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { MathBlock } from '../../types/lab';
import { resolveVariables } from '../../lib/variables';
import { renderLatexToHtml } from '../../lib/math';

interface MathBlockRendererProps {
  block: MathBlock;
  editing: boolean;
  variables: Record<string, string>;
  showRawTokens: boolean;
  onChange?: (updated: MathBlock) => void;
}

const LATEX_SNIPPETS: Array<{ label: string; snippet: string }> = [
  { label: 'Fraction', snippet: '\\frac{a}{b}' },
  { label: 'Sum', snippet: '\\sum_{i=1}^{n} x_i' },
  { label: 'Integral', snippet: '\\int_{a}^{b} f(x)\\,dx' },
  { label: 'Big-O', snippet: '\\mathcal{O}(n \\log n)' },
  { label: 'Sqrt', snippet: '\\sqrt{x^2 + y^2}' },
  { label: 'Matrix', snippet: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
];

export const MathBlockRenderer: React.FC<MathBlockRendererProps> = ({
  block,
  editing,
  variables,
  showRawTokens,
  onChange,
}) => {
  const resolvedLatex = resolveVariables(block.latex, variables, showRawTokens);
  const rendered = renderLatexToHtml(resolvedLatex, true);

  if (editing && onChange) {
    return (
      <div className="border border-slate-200 rounded-md p-3.5 bg-slate-50/70 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-600 mr-1">
              LaTeX Equation
            </span>
            {LATEX_SNIPPETS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() =>
                  onChange({
                    ...block,
                    latex: block.latex ? `${block.latex} ${s.snippet}` : s.snippet,
                  })
                }
                className="px-2 py-0.5 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 rounded cursor-pointer"
              >
                + {s.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="Label e.g. (1)"
            aria-label="Equation label"
            className="w-24 font-mono text-xs text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
          />
        </div>

        <textarea
          value={block.latex}
          onChange={(e) => onChange({ ...block, latex: e.target.value })}
          rows={Math.max(2, block.latex.split('\n').length)}
          spellCheck={false}
          placeholder="Enter LaTeX formula, e.g. \sum_{i=1}^n i = \frac{n(n+1)}{2}"
          className="w-full font-mono text-xs text-slate-900 bg-white border border-slate-200 rounded p-2.5 focus:outline-none focus:border-blue-600 resize-y"
        />

        {/* Live KaTeX Preview */}
        <div className="rounded border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-4 overflow-x-auto">
          <div
            className="flex-1 text-center"
            dangerouslySetInnerHTML={{
              __html: rendered.html || '<span class="text-xs text-slate-400">Equation preview</span>',
            }}
          />
          {block.label && (
            <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
              {block.label}
            </span>
          )}
        </div>

        {rendered.error && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{rendered.error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200/90 bg-slate-50/50 px-4 py-3 flex items-center justify-between gap-4 overflow-x-auto print-break-avoid">
      <div
        className="flex-1 text-center"
        dangerouslySetInnerHTML={{
          __html: rendered.html || '<span class="text-xs text-slate-400">Empty equation</span>',
        }}
      />
      {block.label && (
        <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
          {block.label}
        </span>
      )}
    </div>
  );
};
