import React from 'react';
import { CodeBlock, CodePrintTheme } from '../../types/lab';
import { resolveVariables } from '../../lib/variables';
import {
  DARK_TOKEN_CLASSES,
  LIGHT_TOKEN_CLASSES,
  tokenizeCodeLines,
} from '../../lib/syntaxHighlight';
import { AutoGrowTextarea } from '../AutoGrowTextarea';

const LANGUAGES = [
  'bash',
  'python',
  'cisco',
  'powershell',
  'sql',
  'cpp',
  'javascript',
  'yaml',
  'json',
  'text',
];

interface CodeBlockRendererProps {
  block: CodeBlock;
  editing: boolean;
  printMode?: boolean;
  codePrintTheme?: CodePrintTheme;
  variables: Record<string, string>;
  showRawTokens: boolean;
  onChange?: (updated: CodeBlock) => void;
}

export const CodeBlockRenderer: React.FC<CodeBlockRendererProps> = ({
  block,
  editing,
  printMode = false,
  codePrintTheme = 'light',
  variables,
  showRawTokens,
  onChange,
}) => {
  const showLineNumbers = block.showLineNumbers !== false;

  if (editing && onChange) {
    return (
      <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
          <AutoGrowTextarea
            value={block.title}
            onChange={(val) => onChange({ ...block, title: val })}
            placeholder="Snippet title or filename..."
            ariaLabel="Code snippet title"
            singleLineWrap
            className="flex-1 min-w-[140px] text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
          />
          <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 select-none cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(e) => onChange({ ...block, showLineNumbers: e.target.checked })}
              className="rounded border-slate-300"
            />
            Line #
          </label>
          <select
            value={block.language}
            onChange={(e) => onChange({ ...block, language: e.target.value })}
            aria-label="Code language"
            className="text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded px-2 py-1"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={block.code}
          onChange={(e) => onChange({ ...block, code: e.target.value })}
          rows={Math.max(4, block.code.split('\n').length + 1)}
          spellCheck={false}
          placeholder="Enter commands or source code..."
          className="w-full font-mono text-xs leading-relaxed bg-slate-900 text-slate-100 p-3 focus:outline-none resize-y"
        />
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 space-y-1">
          <div className="text-[11px] font-medium text-slate-500">
            Expected Output (optional — leave empty to hide)
          </div>
          <textarea
            value={block.expectedOutput}
            onChange={(e) => onChange({ ...block, expectedOutput: e.target.value })}
            rows={2}
            spellCheck={false}
            placeholder="Expected terminal output..."
            className="w-full font-mono text-xs text-slate-700 bg-white border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>
    );
  }

  const resolvedCode = resolveVariables(block.code, variables, showRawTokens);
  const resolvedOut = resolveVariables(block.expectedOutput, variables, showRawTokens);
  const lines = tokenizeCodeLines(resolvedCode, block.language);

  // Use dark theme on screen, and ink-saving light theme in print mode when enabled
  const useLightTheme = printMode && codePrintTheme === 'light';
  const tokenMap = useLightTheme ? LIGHT_TOKEN_CLASSES : DARK_TOKEN_CLASSES;

  return (
    <div className="border border-slate-200 rounded-md overflow-hidden print-break-avoid">
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs text-slate-600 font-mono">
        <span className="break-words min-w-0">
          {resolveVariables(block.title || 'Code Listing', variables, showRawTokens)}
        </span>
        <span className="text-slate-400 shrink-0">{block.language}</span>
      </div>
      <pre
        className={`font-mono text-[12.5px] leading-relaxed p-3.5 overflow-x-auto m-0 ${
          useLightTheme
            ? 'bg-slate-50/90 text-slate-800'
            : 'bg-slate-900 text-slate-100'
        }`}
      >
        <code>
          {lines.map((tokens, lineIdx) => (
            <div key={lineIdx} className="flex">
              {showLineNumbers && (
                <span
                  aria-hidden="true"
                  className={`select-none shrink-0 w-7 pr-3 mr-3 text-right tabular-nums border-r ${
                    useLightTheme
                      ? 'text-slate-400 border-slate-200'
                      : 'text-slate-500 border-slate-800'
                  }`}
                >
                  {lineIdx + 1}
                </span>
              )}
              <span className="whitespace-pre flex-1">
                {tokens.length === 0 ? (
                  '\u00A0'
                ) : (
                  tokens.map((tok, tIdx) => (
                    <span key={tIdx} className={tokenMap[tok.kind]}>
                      {tok.text}
                    </span>
                  ))
                )}
              </span>
            </div>
          ))}
        </code>
      </pre>
      {resolvedOut.trim() && (
        <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">
            Expected Output
          </div>
          <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap m-0">
            {resolvedOut}
          </pre>
        </div>
      )}
    </div>
  );
};
