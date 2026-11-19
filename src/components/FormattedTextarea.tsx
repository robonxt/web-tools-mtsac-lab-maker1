import React, { useRef, useState } from 'react';
import { Bold, Braces, Code, Italic } from 'lucide-react';

interface FormattedTextareaProps {
  value: string;
  onChange: (next: string) => void;
  variables: Record<string, string>;
  placeholder?: string;
  rows?: number;
  className?: string;
  compactToolbar?: boolean;
}

export const FormattedTextarea: React.FC<FormattedTextareaProps> = ({
  value,
  onChange,
  variables,
  placeholder,
  rows = 3,
  className = '',
  compactToolbar = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showVars, setShowVars] = useState(false);

  const wrapSelection = (prefix: string, suffix: string, fallbackText: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}${value ? ' ' : ''}${prefix}${fallbackText}${suffix}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const inner = selected || fallbackText;
    const next = `${value.slice(0, start)}${prefix}${inner}${suffix}${value.slice(end)}`;
    onChange(next);

    window.requestAnimationFrame(() => {
      el.focus();
      const selStart = start + prefix.length;
      const selEnd = selStart + inner.length;
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}${snippet}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(next);
    setShowVars(false);

    window.requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        wrapSelection('**', '**', 'bold text');
      } else if (key === 'i') {
        e.preventDefault();
        wrapSelection('*', '*', 'italic text');
      } else if (key === 'e') {
        e.preventDefault();
        wrapSelection('`', '`', 'code');
      }
    }
  };

  const varEntries = Object.entries(variables);

  return (
    <div className="space-y-1.5 relative">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrapSelection('**', '**', 'bold text')}
          title="Bold selected text (Ctrl/Cmd+B)"
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <Bold className="w-3 h-3" />
          {!compactToolbar && 'Bold'}
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrapSelection('*', '*', 'italic text')}
          title="Italicize selected text (Ctrl/Cmd+I)"
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <Italic className="w-3 h-3" />
          {!compactToolbar && 'Italic'}
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrapSelection('`', '`', 'command')}
          title="Format selected text as inline code (Ctrl/Cmd+E)"
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <Code className="w-3 h-3" />
          {!compactToolbar && 'Code'}
        </button>

        <span className="h-3.5 w-px bg-slate-200 mx-0.5" aria-hidden="true" />

        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowVars((v) => !v)}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
              showVars
                ? 'bg-blue-700 text-white'
                : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <Braces className="w-3 h-3" />
            + Variable
          </button>

          {showVars && (
            <div className="absolute left-0 top-full mt-1 z-30 w-72 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg p-1.5 space-y-0.5">
              <div className="px-2 py-1 text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Insert at cursor</span>
                <button
                  type="button"
                  onClick={() => setShowVars(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
              {varEntries.map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertAtCursor(`{{${key}}}`)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="font-mono text-[11px] text-blue-700 shrink-0">
                    {`{{${key}}}`}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate">{val}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={`w-full text-slate-800 bg-slate-50/70 border border-slate-200 rounded-md p-2.5 focus:outline-none focus:bg-white focus:border-blue-600 resize-y ${className}`}
      />
    </div>
  );
};
