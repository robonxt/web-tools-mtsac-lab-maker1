import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bold,
  Braces,
  CheckSquare,
  Code,
  Code2,
  Heading2,
  ImageIcon,
  Italic,
  ListOrdered,
  MessageSquareText,
  Scissors,
  Sigma,
  Table2,
  Type,
} from 'lucide-react';
import { LabBlockType } from '../types/lab';

interface SlashCommandItem {
  type: LabBlockType;
  label: string;
  hint: string;
  keywords: string;
  icon: React.FC<{ className?: string }>;
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  { type: 'heading', label: 'Heading', hint: 'Section heading (H1–H3)', keywords: 'h1 h2 h3 title section', icon: Heading2 },
  { type: 'steps', label: 'Steps', hint: 'Auto-numbered lab procedure', keywords: 'procedure list numbered guide', icon: ListOrdered },
  { type: 'code', label: 'Code Block', hint: 'Syntax-highlighted listing', keywords: 'snippet terminal bash python sql', icon: Code2 },
  { type: 'image', label: 'Image / Figure', hint: 'Upload diagram or photo', keywords: 'figure diagram photo picture chart', icon: ImageIcon },
  { type: 'math', label: 'Math Equation', hint: 'Display LaTeX formula', keywords: 'latex formula equation katex', icon: Sigma },
  { type: 'callout', label: 'Note / Callout', hint: 'Tip, caution, or prerequisite', keywords: 'tip warning info caution prereq', icon: AlertCircle },
  { type: 'table', label: 'Table', hint: 'Data table or rubric', keywords: 'grid rubric columns rows', icon: Table2 },
  { type: 'response', label: 'Question / Response', hint: 'Prompt with answer lines & key', keywords: 'prompt answer rubric points homework', icon: MessageSquareText },
  { type: 'checklist', label: 'Checklist', hint: 'Printable checkbox items', keywords: 'todo verify tasks checkboxes', icon: CheckSquare },
  { type: 'pageBreak', label: 'Page Break', hint: 'Start a fresh printed page', keywords: 'split break new page', icon: Scissors },
  { type: 'paragraph', label: 'Paragraph', hint: 'Standard formatted text', keywords: 'text body copy', icon: Type },
];

interface FormattedTextareaProps {
  value: string;
  onChange: (next: string) => void;
  variables: Record<string, string>;
  placeholder?: string;
  rows?: number;
  className?: string;
  compactToolbar?: boolean;
  enableSlashCommands?: boolean;
  onSlashConvert?: (type: LabBlockType) => void;
  onInsertBelow?: () => void;
  onDeleteIfEmpty?: () => void;
}

export const FormattedTextarea: React.FC<FormattedTextareaProps> = ({
  value,
  onChange,
  variables,
  placeholder,
  rows = 3,
  className = '',
  compactToolbar = false,
  enableSlashCommands = false,
  onSlashConvert,
  onInsertBelow,
  onDeleteIfEmpty,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showVars, setShowVars] = useState(false);

  // Live {{ variable autocomplete state
  const [varQuery, setVarQuery] = useState<{ start: number; query: string } | null>(null);
  const [varActiveIdx, setVarActiveIdx] = useState(0);

  // Live / slash command menu state
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashActiveIdx, setSlashActiveIdx] = useState(0);

  const varEntries = useMemo(() => Object.entries(variables), [variables]);

  const filteredVars = useMemo(() => {
    if (!varQuery) return [];
    const q = varQuery.query.toLowerCase();
    return varEntries.filter(
      ([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q)
    );
  }, [varEntries, varQuery]);

  const filteredSlash = useMemo(() => {
    if (slashQuery === null) return [];
    const q = slashQuery.toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.hint.toLowerCase().includes(q) ||
        cmd.keywords.includes(q)
    );
  }, [slashQuery]);

  // Auto-grow textarea cleanly
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, rows * 22 + 16)}px`;
  }, [value, rows]);

  useEffect(() => {
    setVarActiveIdx(0);
  }, [varQuery?.query]);

  useEffect(() => {
    setSlashActiveIdx(0);
  }, [slashQuery]);

  const detectTriggers = (nextValue: string, caret: number) => {
    // 1. Detect {{var... before caret
    const before = nextValue.slice(0, caret);
    const varMatch = before.match(/\{\{([a-zA-Z0-9_.-]*)$/);
    if (varMatch) {
      setVarQuery({ start: caret - varMatch[0].length, query: varMatch[1] });
      setSlashQuery(null);
      return;
    } else {
      setVarQuery(null);
    }

    // 2. Detect slash command at start of an empty paragraph (e.g. "/code", "/math", "/")
    if (enableSlashCommands && onSlashConvert) {
      const slashMatch = nextValue.match(/^\/([a-zA-Z0-9 ]*)$/);
      if (slashMatch && caret === nextValue.length) {
        setSlashQuery(slashMatch[1].trim());
        return;
      }
    }
    setSlashQuery(null);
  };

  const applyVarAutocomplete = (key: string) => {
    const el = textareaRef.current;
    if (!varQuery) return;
    const caret = el?.selectionStart ?? value.length;
    const token = `{{${key}}}`;
    // Skip duplicate closing braces if user already typed them
    const afterRaw = value.slice(caret);
    const after = afterRaw.startsWith('}}') ? afterRaw.slice(2) : afterRaw;
    const next = `${value.slice(0, varQuery.start)}${token}${after}`;
    const nextPos = varQuery.start + token.length;
    onChange(next);
    setVarQuery(null);
    window.requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(nextPos, nextPos);
    });
  };

  const applySlashCommand = (type: LabBlockType) => {
    setSlashQuery(null);
    if (type === 'paragraph') {
      onChange('');
      return;
    }
    onSlashConvert?.(type);
  };

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
    // Handle live {{ variable autocomplete navigation
    if (varQuery && filteredVars.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVarActiveIdx((i) => (i + 1) % filteredVars.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVarActiveIdx((i) => (i - 1 + filteredVars.length) % filteredVars.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = filteredVars[varActiveIdx] || filteredVars[0];
        if (chosen) applyVarAutocomplete(chosen[0]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setVarQuery(null);
        return;
      }
    }

    // Handle live / slash command menu navigation
    if (slashQuery !== null && filteredSlash.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashActiveIdx((i) => (i + 1) % filteredSlash.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashActiveIdx((i) => (i - 1 + filteredSlash.length) % filteredSlash.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = filteredSlash[slashActiveIdx] || filteredSlash[0];
        if (chosen) applySlashCommand(chosen.type);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashQuery(null);
        return;
      }
    }

    // Backspace on completely empty paragraph deletes block cleanly
    if (e.key === 'Backspace' && value === '' && onDeleteIfEmpty) {
      e.preventDefault();
      onDeleteIfEmpty();
      return;
    }

    // Ctrl/Cmd shortcuts
    if (e.metaKey || e.ctrlKey) {
      const key = e.key.toLowerCase();
      if (key === 'enter' && onInsertBelow) {
        e.preventDefault();
        onInsertBelow();
      } else if (key === 'b') {
        e.preventDefault();
        wrapSelection('**', '**', 'bold text');
      } else if (key === 'i') {
        e.preventDefault();
        wrapSelection('*', '*', 'italic text');
      } else if (key === 'e') {
        e.preventDefault();
        wrapSelection('`', '`', 'code');
      } else if (key === 'm') {
        e.preventDefault();
        wrapSelection('$', '$', 'O(n \\log n)');
      }
    }
  };

  return (
    <div className="space-y-1.5 relative">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrapSelection('**', '**', 'bold text')}
          aria-label="Bold"
          title="Bold (Ctrl/Cmd+B)"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrapSelection('*', '*', 'italic text')}
          aria-label="Italic"
          title="Italic (Ctrl/Cmd+I)"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrapSelection('`', '`', 'command')}
          aria-label="Inline code"
          title="Inline code (Ctrl/Cmd+E)"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrapSelection('$', '$', 'x^2 + y^2')}
          aria-label="Inline LaTeX math"
          title="Inline math $...$ (Ctrl/Cmd+M)"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
        >
          <Sigma className="w-3.5 h-3.5" />
        </button>

        <span className="h-3.5 w-px bg-slate-200 mx-0.5" aria-hidden="true" />

        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowVars((v) => !v)}
            title="Insert a shared course variable at cursor (or type {{ )"
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
              showVars
                ? 'bg-blue-700 text-white'
                : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <Braces className="w-3 h-3" />
            {compactToolbar ? 'Var' : 'Variable'}
          </button>

          {showVars && (
            <div className="absolute left-0 top-full mt-1 z-40 w-72 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg p-1.5 space-y-0.5">
              <div className="px-2 py-1 text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Insert at cursor (tip: type {`{{`})</span>
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

        {enableSlashCommands && !compactToolbar && (
          <span className="ml-auto text-[11px] text-slate-400 hidden sm:inline">
            Type <span className="font-mono text-slate-500">/</span> for blocks ·{' '}
            <span className="font-mono text-slate-500">{`{{`}</span> for vars ·{' '}
            <span className="font-mono text-slate-500">$math$</span>
          </span>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          detectTriggers(next, e.target.selectionStart ?? next.length);
        }}
        onClick={(e) => {
          detectTriggers(value, e.currentTarget.selectionStart ?? value.length);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setVarQuery(null);
            setSlashQuery(null);
          }, 140);
        }}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={`w-full text-slate-800 bg-slate-50/70 border border-slate-200 rounded-md p-2.5 focus:outline-none focus:bg-white focus:border-blue-600 resize-none overflow-hidden break-words ${className}`}
      />

      {/* Live {{ Variable Autocomplete Popover */}
      {varQuery && (
        <div
          role="listbox"
          aria-label="Variable autocomplete"
          className="absolute left-0 top-full mt-1 z-40 w-80 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 space-y-0.5"
        >
          <div className="px-2 py-1 text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Course &amp; Global Variables</span>
            <span className="font-mono text-[10px]">↑↓ · Enter</span>
          </div>
          {filteredVars.length === 0 ? (
            <div className="px-2 py-2 text-xs text-slate-500">
              No variable matching <span className="font-mono text-amber-700">{`{{${varQuery.query}}}`}</span>
            </div>
          ) : (
            filteredVars.map(([key, val], idx) => (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={idx === varActiveIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyVarAutocomplete(key);
                }}
                onMouseEnter={() => setVarActiveIdx(idx)}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  idx === varActiveIdx ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50'
                }`}
              >
                <span className="font-mono text-xs text-blue-700 shrink-0">{`{{${key}}}`}</span>
                <span className="text-[11px] text-slate-500 truncate">{val}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Live / Slash Command Palette */}
      {slashQuery !== null && (
        <div
          role="listbox"
          aria-label="Insert block command menu"
          className="absolute left-0 top-full mt-1 z-40 w-80 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 space-y-0.5"
        >
          <div className="px-2 py-1 text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Insert Block</span>
            <span className="font-mono text-[10px]">↑↓ · Enter · Esc</span>
          </div>
          {filteredSlash.length === 0 ? (
            <div className="px-2 py-2 text-xs text-slate-500">
              No block matching “/{slashQuery}”
            </div>
          ) : (
            filteredSlash.map((cmd, idx) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.type}
                  type="button"
                  role="option"
                  aria-selected={idx === slashActiveIdx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySlashCommand(cmd.type);
                  }}
                  onMouseEnter={() => setSlashActiveIdx(idx)}
                  className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2.5 transition-colors cursor-pointer ${
                    idx === slashActiveIdx ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="w-6 h-6 rounded bg-slate-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">
                      {cmd.label}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{cmd.hint}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
