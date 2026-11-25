import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bold,
  Braces,
  CheckSquare,
  ChevronDown,
  Code,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Heading2,
  ImageIcon,
  Italic,
  Layers,
  ListOrdered,
  MessageSquareText,
  Minus,
  Plus,
  Scissors,
  Sigma,
  Table2,
  Trash2,
  Type,
} from 'lucide-react';
import {
  CalloutVariant,
  ImageAlign,
  ImageWidthPreset,
  LabBlock,
  LabBlockType,
  ReusableModule,
} from '../types/lab';

interface EditorRibbonProps {
  selectedBlock: LabBlock | null;
  selectedIndex: number;
  totalBlocks: number;
  modules: ReusableModule[];
  onInsertBlock: (type: LabBlockType, moduleId?: string) => void;
  onUpdateBlock: (blockId: string, updated: LabBlock) => void;
  onMoveBlock: (blockId: string, dir: -1 | 1) => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
}

const PRIMARY_INSERT: Array<{
  type: LabBlockType;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { type: 'heading', label: 'Heading', icon: Heading2 },
  { type: 'paragraph', label: 'Text', icon: Type },
  { type: 'steps', label: 'Steps', icon: ListOrdered },
  { type: 'code', label: 'Code', icon: Code2 },
  { type: 'response', label: 'Question', icon: MessageSquareText },
];

const MORE_INSERT: Array<{
  type: LabBlockType;
  label: string;
  hint: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { type: 'callout', label: 'Note / Callout', hint: 'Tip, warning, or prereq', icon: AlertCircle },
  { type: 'image', label: 'Image / Figure', hint: 'Diagram or photo', icon: ImageIcon },
  { type: 'math', label: 'Math Formula', hint: 'LaTeX equation', icon: Sigma },
  { type: 'table', label: 'Table / Rubric', hint: 'Grid or grading rubric', icon: Table2 },
  { type: 'checklist', label: 'Checklist', hint: 'Printable checkboxes', icon: CheckSquare },
  { type: 'pageBreak', label: 'Page Break', hint: 'Start a new page', icon: Scissors },
];

const CALLOUT_VARIANTS: Array<{ id: CalloutVariant; label: string }> = [
  { id: 'info', label: 'Info' },
  { id: 'tip', label: 'Tip' },
  { id: 'caution', label: 'Caution' },
  { id: 'prereq', label: 'Prereq' },
];

const CODE_LANGUAGES = [
  'bash',
  'python',
  'sql',
  'c',
  'cpp',
  'javascript',
  'typescript',
  'json',
  'text',
];

const IMAGE_WIDTHS: ImageWidthPreset[] = [40, 65, 85, 100];
const IMAGE_ALIGNS: Array<{ id: ImageAlign; label: string }> = [
  { id: 'left', label: 'Left' },
  { id: 'center', label: 'Center' },
  { id: 'right', label: 'Right' },
];

/**
 * Applies markdown wrapper or token insertion to the currently focused input/textarea
 * while triggering React's controlled input change event.
 */
function applyFormatToFocusedField(prefix: string, suffix: string, fallback: string): void {
  const el = document.activeElement;
  if (
    !(el instanceof HTMLTextAreaElement) &&
    !(el instanceof HTMLInputElement && (el.type === 'text' || el.type === 'search' || !el.type))
  ) {
    return;
  }

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const selected = el.value.slice(start, end) || fallback;
  const nextValue = el.value.slice(0, start) + prefix + selected + suffix + el.value.slice(end);

  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) {
    setter.call(el, nextValue);
  } else {
    el.value = nextValue;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));

  const cursorStart = start + prefix.length;
  const cursorEnd = cursorStart + selected.length;
  window.requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(cursorStart, cursorEnd);
  });
}

export const EditorRibbon: React.FC<EditorRibbonProps> = ({
  selectedBlock,
  selectedIndex,
  totalBlocks,
  modules,
  onInsertBlock,
  onUpdateBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    const onPointerDown = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showMoreMenu]);

  const ribbonBtn =
    'inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-white active:bg-slate-100 rounded-md border border-transparent hover:border-slate-200/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer';

  const pillBtn = (active: boolean) =>
    `inline-flex items-center justify-center min-h-[32px] px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
      active
        ? 'bg-blue-600 text-white shadow-2xs'
        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
    }`;

  return (
    <div
      role="toolbar"
      aria-label="Document formatting and block ribbon"
      className="shrink-0 bg-[#F8FAFC] border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 overflow-x-auto select-none"
    >
      {/* Group 1: Insert Blocks */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 hidden xl:inline">
          Insert
        </span>
        {PRIMARY_INSERT.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onInsertBlock(type)}
            title={`Insert ${label}`}
            className={ribbonBtn}
          >
            <Icon className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{label}</span>
          </button>
        ))}

        {/* More Insert Dropdown */}
        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => setShowMoreMenu((v) => !v)}
            aria-expanded={showMoreMenu}
            aria-haspopup="menu"
            className={`${ribbonBtn} ${showMoreMenu ? 'bg-white border-slate-200 text-slate-900' : ''}`}
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>More</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showMoreMenu && (
            <div
              role="menu"
              className="absolute left-0 top-[calc(100%+6px)] z-50 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5"
            >
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                More Elements
              </div>
              {MORE_INSERT.map(({ type, label, hint, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onInsertBlock(type);
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-900">{label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{hint}</div>
                  </div>
                </button>
              ))}

              {modules.length > 0 && (
                <>
                  <div className="my-1 border-t border-slate-100" />
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Shared Modules
                  </div>
                  {modules.slice(0, 5).map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onInsertBlock('moduleRef', mod.id);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="text-xs font-medium text-slate-800 truncate">{mod.title}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <span className="h-6 w-px bg-slate-200 shrink-0" aria-hidden="true" />

      {/* Group 2: Inline Text Formatting */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 hidden xl:inline">
          Format
        </span>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormatToFocusedField('**', '**', 'bold');
          }}
          title="Bold (**text**)"
          aria-label="Bold"
          className={ribbonBtn}
        >
          <Bold className="w-4 h-4 text-slate-600" />
          <span className="hidden 2xl:inline">Bold</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormatToFocusedField('*', '*', 'italic');
          }}
          title="Italic (*text*)"
          aria-label="Italic"
          className={ribbonBtn}
        >
          <Italic className="w-4 h-4 text-slate-600" />
          <span className="hidden 2xl:inline">Italic</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormatToFocusedField('`', '`', 'code');
          }}
          title="Inline Code (`code`)"
          aria-label="Inline Code"
          className={ribbonBtn}
        >
          <Code className="w-4 h-4 text-slate-600" />
          <span className="hidden 2xl:inline">Code</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormatToFocusedField('{{', '}}', 'variable');
          }}
          title="Insert Variable Token ({{variable}})"
          aria-label="Insert Variable"
          className={ribbonBtn}
        >
          <Braces className="w-4 h-4 text-slate-600" />
          <span className="hidden 2xl:inline">Variable</span>
        </button>
      </div>

      {/* Group 3: Contextual Block Controls */}
      {selectedBlock && (
        <>
          <span className="h-6 w-px bg-slate-200 shrink-0" aria-hidden="true" />
          <div className="flex items-center gap-1.5 shrink-0">
            {selectedBlock.type === 'heading' && (
              <div className="flex items-center gap-1">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, { ...selectedBlock, level: lvl })
                    }
                    className={pillBtn(selectedBlock.level === lvl)}
                  >
                    H{lvl}
                  </button>
                ))}
              </div>
            )}

            {selectedBlock.type === 'callout' && (
              <div className="flex items-center gap-1">
                {CALLOUT_VARIANTS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, { ...selectedBlock, variant: v.id })
                    }
                    className={pillBtn(selectedBlock.variant === v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}

            {selectedBlock.type === 'code' && (
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Code language"
                  value={selectedBlock.language}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, {
                      ...selectedBlock,
                      language: e.target.value,
                    })
                  }
                  className="min-h-[32px] px-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md cursor-pointer"
                >
                  {CODE_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBlock(selectedBlock.id, {
                      ...selectedBlock,
                      showLineNumbers: !selectedBlock.showLineNumbers,
                    })
                  }
                  className={pillBtn(Boolean(selectedBlock.showLineNumbers))}
                >
                  Line #
                </button>
              </div>
            )}

            {selectedBlock.type === 'response' && (
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-1.5 min-h-[32px]">
                  <span className="text-[11px] text-slate-500">Pts</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, {
                        ...selectedBlock,
                        points: Math.max(0, selectedBlock.points - 5),
                      })
                    }
                    className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                    aria-label="Decrease points"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-semibold tabular-nums min-w-[20px] text-center">
                    {selectedBlock.points}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, {
                        ...selectedBlock,
                        points: selectedBlock.points + 5,
                      })
                    }
                    className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                    aria-label="Increase points"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-1.5 min-h-[32px]">
                  <span className="text-[11px] text-slate-500">Lines</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, {
                        ...selectedBlock,
                        answerLines: Math.max(1, selectedBlock.answerLines - 1),
                      })
                    }
                    className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                    aria-label="Decrease answer lines"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-semibold tabular-nums min-w-[16px] text-center">
                    {selectedBlock.answerLines}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, {
                        ...selectedBlock,
                        answerLines: Math.min(20, selectedBlock.answerLines + 1),
                      })
                    }
                    className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                    aria-label="Increase answer lines"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {selectedBlock.type === 'image' && (
              <div className="flex items-center gap-1">
                {IMAGE_WIDTHS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, { ...selectedBlock, width: w })
                    }
                    className={pillBtn(selectedBlock.width === w)}
                  >
                    {w}%
                  </button>
                ))}
                {IMAGE_ALIGNS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, { ...selectedBlock, align: a.id })
                    }
                    className={pillBtn(selectedBlock.align === a.id)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Group 4: Block Arrange & Actions */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        {selectedBlock ? (
          <>
            <button
              type="button"
              onClick={() => onMoveBlock(selectedBlock.id, -1)}
              disabled={selectedIndex <= 0}
              title="Move section up"
              className={`${ribbonBtn} disabled:opacity-35 disabled:pointer-events-none`}
            >
              <ArrowUp className="w-4 h-4 text-slate-600" />
              <span className="hidden lg:inline">Up</span>
            </button>
            <button
              type="button"
              onClick={() => onMoveBlock(selectedBlock.id, 1)}
              disabled={selectedIndex >= totalBlocks - 1}
              title="Move section down"
              className={`${ribbonBtn} disabled:opacity-35 disabled:pointer-events-none`}
            >
              <ArrowDown className="w-4 h-4 text-slate-600" />
              <span className="hidden lg:inline">Down</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateBlock(selectedBlock.id, {
                  ...selectedBlock,
                  audience: selectedBlock.audience === 'instructor' ? 'all' : 'instructor',
                })
              }
              title={
                selectedBlock.audience === 'instructor'
                  ? 'Instructor-only — click to show in Student Handout'
                  : 'Visible to all — click to make Instructor-only'
              }
              className={`${ribbonBtn} ${
                selectedBlock.audience === 'instructor' ? 'bg-amber-50 text-amber-800 border-amber-200' : ''
              }`}
            >
              {selectedBlock.audience === 'instructor' ? (
                <EyeOff className="w-4 h-4 text-amber-700" />
              ) : (
                <Eye className="w-4 h-4 text-slate-600" />
              )}
              <span className="hidden lg:inline">
                {selectedBlock.audience === 'instructor' ? 'Key Only' : 'Student'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDuplicateBlock(selectedBlock.id)}
              title="Duplicate block"
              className={ribbonBtn}
            >
              <Copy className="w-4 h-4 text-slate-600" />
              <span className="hidden xl:inline">Duplicate</span>
            </button>
            <button
              type="button"
              onClick={() => onDeleteBlock(selectedBlock.id)}
              title="Delete block"
              className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden xl:inline">Delete</span>
            </button>
          </>
        ) : (
          <span className="text-[11px] text-slate-400 px-2 hidden md:inline">
            Click any section to format or arrange
          </span>
        )}
      </div>
    </div>
  );
};
