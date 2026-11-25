import React, { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  GripVertical,
  Layers,
  Plus,
  Trash2,
  Unlink,
} from 'lucide-react';
import {
  AudienceMode,
  BlockSlice,
  CalloutVariant,
  CodePrintTheme,
  LabBlock,
  LabBlockType,
  LayoutProfile,
  ReusableModule,
} from '../types/lab';
import { createId } from '../lib/blockFactory';
import { clearActiveDrag, writeDragPayload } from '../lib/dnd';
import { InlineRichText } from './InlineRichText';
import { FormattedTextarea } from './FormattedTextarea';
import { AutoGrowTextarea } from './AutoGrowTextarea';
import { CodeBlockRenderer } from './blocks/CodeBlockRenderer';
import { ImageBlockRenderer } from './blocks/ImageBlockRenderer';
import { MathBlockRenderer } from './blocks/MathBlockRenderer';
import { StepsBlockRenderer } from './blocks/StepsBlockRenderer';
import { TableBlockRenderer } from './blocks/TableBlockRenderer';

interface BlockViewProps {
  block: LabBlock;
  index: number;
  totalBlocks: number;
  isSelected: boolean;
  readOnly?: boolean;
  printMode?: boolean;
  codePrintTheme?: CodePrintTheme;
  slice?: BlockSlice;
  audienceMode: AudienceMode;
  layout: LayoutProfile;
  variables: Record<string, string>;
  showRawTokens: boolean;
  modules: ReusableModule[];
  onSelect?: () => void;
  onChange?: (updated: LabBlock) => void;
  onMove?: (direction: -1 | 1) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onConvertBlockType?: (type: LabBlockType) => void;
  onInsertParagraphBelow?: () => void;
  onSaveAsModule?: () => void;
  onEditMasterModule?: (moduleId: string) => void;
  onDetachModule?: (blockId: string, moduleId: string) => void;
}

const CALLOUT_STYLES: Record<
  CalloutVariant,
  { bg: string; border: string; labelColor: string; label: string }
> = {
  info: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    labelColor: 'text-slate-700',
    label: 'Note',
  },
  tip: {
    bg: 'bg-teal-50/70',
    border: 'border-teal-200',
    labelColor: 'text-teal-800',
    label: 'Tip',
  },
  caution: {
    bg: 'bg-amber-50/80',
    border: 'border-amber-200',
    labelColor: 'text-amber-900',
    label: 'Caution',
  },
  prereq: {
    bg: 'bg-blue-50/70',
    border: 'border-blue-200',
    labelColor: 'text-blue-800',
    label: 'Prerequisite',
  },
};

export const BlockView: React.FC<BlockViewProps> = ({
  block,
  index,
  totalBlocks,
  isSelected,
  readOnly = false,
  printMode = false,
  codePrintTheme,
  slice,
  audienceMode,
  layout,
  variables,
  showRawTokens,
  modules,
  onSelect,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
  onConvertBlockType,
  onInsertParagraphBelow,
  onSaveAsModule,
  onEditMasterModule,
  onDetachModule,
}) => {
  const checklistRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [isGripActive, setIsGripActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Safety cleanup if dragend/mouseup happens outside the grip element
  useEffect(() => {
    if (!isGripActive && !isDragging) return;
    const handleEnd = () => {
      setIsDragging(false);
      setIsGripActive(false);
    };
    const handleMouseUp = () => {
      if (!isDragging) setIsGripActive(false);
    };
    window.addEventListener('dragend', handleEnd);
    window.addEventListener('drop', handleEnd);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('dragend', handleEnd);
      window.removeEventListener('drop', handleEnd);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isGripActive, isDragging]);

  // Hide instructor-only blocks in Student Handout view
  if (audienceMode === 'student' && block.audience === 'instructor') {
    return null;
  }

  const isInstructorOnly = block.audience === 'instructor';
  const editing = !readOnly && isSelected;
  const compact = layout.density === 'compact';
  const keepControlsInteractive = isSelected || isGripActive || isDragging;
  const effectiveCodePrint = codePrintTheme || layout.codePrintTheme || 'light';

  const renderInnerContent = () => {
    switch (block.type) {
      case 'heading': {
        const sizeClass =
          block.level === 1
            ? 'text-[22px] font-bold tracking-tight text-slate-900 leading-tight'
            : block.level === 2
              ? 'text-[18px] font-semibold text-slate-900 pb-1.5 border-b border-slate-200 leading-snug'
              : 'text-[15px] font-semibold text-slate-800 leading-snug';

        if (editing && onChange) {
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChange({ ...block, level: lvl })}
                    className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                      block.level === lvl
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    H{lvl}
                  </button>
                ))}
              </div>
              <AutoGrowTextarea
                value={block.text}
                onChange={(val) => onChange({ ...block, text: val })}
                placeholder="Section heading..."
                ariaLabel="Section heading"
                singleLineWrap
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && onInsertParagraphBelow) {
                    e.preventDefault();
                    onInsertParagraphBelow();
                  } else if (e.key === 'Backspace' && block.text === '' && onDelete) {
                    e.preventDefault();
                    onDelete();
                  }
                }}
                className={`w-full bg-transparent focus:outline-none ${sizeClass}`}
              />
            </div>
          );
        }

        return (
          <div className={`${sizeClass} break-words`}>
            <InlineRichText
              text={block.text || 'Untitled Heading'}
              variables={variables}
              showRawTokens={showRawTokens}
            />
          </div>
        );
      }

      case 'paragraph': {
        if (editing && onChange) {
          return (
            <FormattedTextarea
              value={block.text}
              onChange={(next) => onChange({ ...block, text: next })}
              variables={variables}
              rows={Math.max(2, Math.ceil((block.text.length || 1) / 82))}
              placeholder="Write instructions, or type / for blocks, {{ for variables, $x^2$ for math..."
              enableSlashCommands
              onSlashConvert={onConvertBlockType}
              onInsertBelow={onInsertParagraphBelow}
              onDeleteIfEmpty={onDelete}
              className="text-[15px] leading-relaxed"
            />
          );
        }

        return (
          <p
            className={`${compact ? 'text-[14px]' : 'text-[15px]'} leading-relaxed text-slate-800 whitespace-pre-line break-words`}
          >
            <InlineRichText
              text={block.text}
              variables={variables}
              showRawTokens={showRawTokens}
            />
          </p>
        );
      }

      case 'steps':
        return (
          <StepsBlockRenderer
            block={block}
            editing={editing}
            compact={compact}
            layout={layout}
            variables={variables}
            showRawTokens={showRawTokens}
            slice={slice}
            onChange={onChange}
          />
        );

      case 'code':
        return (
          <CodeBlockRenderer
            block={block}
            editing={editing}
            printMode={printMode}
            codePrintTheme={effectiveCodePrint}
            variables={variables}
            showRawTokens={showRawTokens}
            onChange={onChange}
          />
        );

      case 'image':
        return (
          <ImageBlockRenderer
            block={block}
            editing={editing}
            variables={variables}
            showRawTokens={showRawTokens}
            onChange={onChange}
          />
        );

      case 'math':
        return (
          <MathBlockRenderer
            block={block}
            editing={editing}
            variables={variables}
            showRawTokens={showRawTokens}
            onChange={onChange}
          />
        );

      case 'table':
        return (
          <TableBlockRenderer
            block={block}
            editing={editing}
            variables={variables}
            showRawTokens={showRawTokens}
            slice={slice}
            onChange={onChange}
          />
        );

      case 'callout': {
        const style = CALLOUT_STYLES[block.variant];
        if (editing && onChange) {
          return (
            <div className={`rounded-md border p-3 space-y-2 ${style.bg} ${style.border}`}>
              <div className="flex items-start gap-2">
                <select
                  value={block.variant}
                  onChange={(e) =>
                    onChange({ ...block, variant: e.target.value as CalloutVariant })
                  }
                  className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 shrink-0"
                >
                  <option value="info">Note</option>
                  <option value="tip">Tip</option>
                  <option value="prereq">Prerequisite</option>
                  <option value="caution">Caution</option>
                </select>
                <AutoGrowTextarea
                  value={block.title}
                  onChange={(val) => onChange({ ...block, title: val })}
                  placeholder="Callout title..."
                  ariaLabel="Callout title"
                  singleLineWrap
                  className="flex-1 min-w-0 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-blue-600"
                />
              </div>
              <FormattedTextarea
                value={block.body}
                onChange={(next) => onChange({ ...block, body: next })}
                variables={variables}
                rows={2}
                compactToolbar
                placeholder="Callout details..."
                className="text-sm bg-white"
              />
            </div>
          );
        }

        return (
          <div
            className={`rounded-md border px-4 py-3 print-break-avoid ${style.bg} ${style.border}`}
          >
            <div className={`text-xs font-semibold mb-1 break-words ${style.labelColor}`}>
              <span>{style.label}</span>
              <span className="mx-1.5 opacity-50">·</span>
              <InlineRichText
                text={block.title}
                variables={variables}
                showRawTokens={showRawTokens}
              />
            </div>
            <div className="text-[14px] leading-relaxed text-slate-700 break-words">
              <InlineRichText
                text={block.body}
                variables={variables}
                showRawTokens={showRawTokens}
              />
            </div>
          </div>
        );
      }

      case 'response': {
        if (editing && onChange) {
          return (
            <div className="border border-slate-300 rounded-md p-3.5 bg-white space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-700">
                  Student Prompt &amp; Instructor Answer Key
                </span>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <label className="flex items-center gap-1">
                    Points
                    <input
                      type="number"
                      min={0}
                      value={block.points}
                      onChange={(e) =>
                        onChange({ ...block, points: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-14 font-mono tabular-nums bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Lines
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={block.answerLines}
                      onChange={(e) =>
                        onChange({
                          ...block,
                          answerLines: Math.min(12, Math.max(2, Number(e.target.value) || 3)),
                        })
                      }
                      className="w-12 font-mono tabular-nums bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5"
                    />
                  </label>
                </div>
              </div>
              <FormattedTextarea
                value={block.prompt}
                onChange={(next) => onChange({ ...block, prompt: next })}
                variables={variables}
                rows={2}
                compactToolbar
                placeholder="Question or submission prompt shown to students..."
                className="text-sm font-medium text-slate-900"
              />
              <div className="rounded border border-amber-200 bg-amber-50/70 p-2.5 space-y-1">
                <div className="text-[11px] font-semibold text-amber-900">
                  Instructor Answer Key &amp; Grading Rubric (Hidden in Student Handout)
                </div>
                <FormattedTextarea
                  value={block.instructorSolution}
                  onChange={(next) => onChange({ ...block, instructorSolution: next })}
                  variables={variables}
                  rows={2}
                  compactToolbar
                  placeholder="Expected answer and grading criteria..."
                  className="text-xs text-slate-800 bg-white border-amber-200"
                />
              </div>
            </div>
          );
        }

        return (
          <div className="border border-slate-300 rounded-md p-4 bg-white print-break-avoid">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="text-[14px] font-semibold text-slate-900 leading-snug break-words min-w-0">
                <InlineRichText
                  text={block.prompt}
                  variables={variables}
                  showRawTokens={showRawTokens}
                />
              </div>
              <span
                className="font-mono text-xs font-semibold tabular-nums whitespace-nowrap shrink-0"
                style={{ color: layout.accentColor }}
              >
                {block.points} pts
              </span>
            </div>
            {audienceMode === 'instructor' ? (
              <div className="rounded border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-[13px] text-slate-800 break-words">
                <div className="text-[11px] font-semibold text-amber-900 mb-1">
                  Instructor Answer Key
                </div>
                <InlineRichText
                  text={block.instructorSolution}
                  variables={variables}
                  showRawTokens={showRawTokens}
                />
              </div>
            ) : (
              <div className="space-y-0">
                {Array.from({ length: Math.max(2, block.answerLines) }).map((_, i) => (
                  <div key={i} className="h-7 border-b border-slate-200" />
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'checklist': {
        if (editing && onChange) {
          const updateItem = (idx: number, text: string) => {
            const items = block.items.map((it, i) => (i === idx ? { ...it, text } : it));
            onChange({ ...block, items });
          };
          const removeItem = (idx: number) => {
            if (block.items.length <= 1) return;
            const prevId = block.items[Math.max(0, idx - 1)]?.id;
            onChange({ ...block, items: block.items.filter((_, i) => i !== idx) });
            if (prevId) {
              window.requestAnimationFrame(() => checklistRefs.current[prevId]?.focus());
            }
          };
          const insertItemAfter = (idx: number) => {
            const newId = createId('chk');
            const next = [...block.items];
            next.splice(idx + 1, 0, { id: newId, text: '' });
            onChange({ ...block, items: next });
            window.requestAnimationFrame(() => checklistRefs.current[newId]?.focus());
          };

          return (
            <div className="border border-slate-200 rounded-md p-3 bg-slate-50/50 space-y-2">
              <AutoGrowTextarea
                value={block.title}
                onChange={(val) => onChange({ ...block, title: val })}
                placeholder="Checklist heading..."
                ariaLabel="Checklist heading"
                singleLineWrap
                className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-blue-600"
              />
              <div className="space-y-1.5">
                {block.items.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span className="w-3.5 h-3.5 mt-2 rounded-[2px] border border-slate-400 shrink-0" />
                    <AutoGrowTextarea
                      inputRef={(el) => {
                        checklistRefs.current[item.id] = el;
                      }}
                      value={item.text}
                      placeholder="Checklist item (press Enter for next)..."
                      ariaLabel={`Checklist item ${idx + 1}`}
                      onChange={(val) => updateItem(idx, val)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          insertItemAfter(idx);
                        } else if (
                          e.key === 'Backspace' &&
                          item.text === '' &&
                          block.items.length > 1
                        ) {
                          e.preventDefault();
                          removeItem(idx);
                        }
                      }}
                      className="flex-1 min-w-0 text-sm text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={block.items.length <= 1}
                      className="p-1 mt-0.5 text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => insertItemAfter(block.items.length - 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>
          );
        }

        return (
          <div className="border border-slate-200 rounded-md px-4 py-3 bg-white print-break-avoid">
            {block.title && (
              <div className="text-sm font-semibold text-slate-900 mb-2 break-words">
                <InlineRichText
                  text={block.title}
                  variables={variables}
                  showRawTokens={showRawTokens}
                />
              </div>
            )}
            <ul className="space-y-1.5">
              {block.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2.5 text-[14px] text-slate-700 break-words"
                >
                  <span
                    aria-hidden="true"
                    className="w-3.5 h-3.5 mt-1 rounded-[2px] border border-slate-400 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <InlineRichText
                      text={item.text}
                      variables={variables}
                      showRawTokens={showRawTokens}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      }

      case 'moduleRef': {
        const mod = modules.find((m) => m.id === block.moduleId);
        if (!mod) {
          return (
            <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/70 px-4 py-3 text-xs text-amber-900">
              Linked module was removed. Detach or delete this block.
            </div>
          );
        }

        return (
          <div
            className={`rounded-md ${
              readOnly ? '' : 'border border-teal-200/90 bg-teal-50/20 p-3 space-y-2.5'
            }`}
          >
            {!readOnly && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-teal-200/70 text-xs">
                <div className="flex items-center gap-1.5 text-teal-800 font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Linked Module: {mod.title}</span>
                  <span className="text-teal-600/70 font-normal">· Synced across labs</span>
                </div>
                <div className="flex items-center gap-2">
                  {onEditMasterModule && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMasterModule(mod.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 hover:underline cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Edit Master
                    </button>
                  )}
                  {onDetachModule && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDetachModule(block.id, mod.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                      title="Convert linked module into independent editable blocks in this lab"
                    >
                      <Unlink className="w-3 h-3" />
                      Detach Copy
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {mod.blocks.map((mb, mIdx) => (
                <BlockView
                  key={mb.id}
                  block={mb}
                  index={mIdx}
                  totalBlocks={mod.blocks.length}
                  isSelected={false}
                  readOnly={true}
                  printMode={printMode}
                  codePrintTheme={effectiveCodePrint}
                  audienceMode={audienceMode}
                  layout={layout}
                  variables={variables}
                  showRawTokens={showRawTokens}
                  modules={modules}
                />
              ))}
            </div>
          </div>
        );
      }

      case 'pageBreak': {
        if (readOnly) {
          return <div className="print-page-break" />;
        }
        return (
          <div className="py-2 flex items-center gap-3 text-[11px] font-mono text-slate-400 select-none">
            <span className="flex-1 border-t border-dashed border-slate-300" />
            <span>Page Break</span>
            <span className="flex-1 border-t border-dashed border-slate-300" />
          </div>
        );
      }
    }
  };

  if (readOnly) {
    return (
      <div
        className={
          isInstructorOnly
            ? 'rounded-md border border-dashed border-amber-400 bg-amber-50/60 p-3.5 space-y-1.5 print-break-avoid'
            : ''
        }
      >
        {isInstructorOnly && (
          <div className="text-[11px] font-semibold text-amber-900">
            Instructor Only · Hidden from Student Handout
          </div>
        )}
        {renderInnerContent()}
      </div>
    );
  }

  const canSaveAsModule =
    Boolean(onSaveAsModule) && block.type !== 'moduleRef' && block.type !== 'pageBreak';

  return (
    <div
      id={slice && slice.start > 0 ? undefined : `block-${block.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className={`group relative rounded-md transition-all ${
        isDragging ? 'opacity-45' : ''
      } ${
        isSelected
          ? 'ring-2 ring-blue-600/80 ring-offset-4 bg-white'
          : 'hover:ring-1 hover:ring-slate-200 hover:ring-offset-4'
      } ${
        isInstructorOnly
          ? 'border border-dashed border-amber-400 bg-amber-50/50 p-3 space-y-1.5'
          : ''
      }`}
    >
      {/* Floating Minimal Block Controls — sits above the block outline so it never covers interior fields */}
      <div
        className={`absolute bottom-full right-0 z-20 pb-2 transition-opacity ${
          keepControlsInteractive
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-sm px-1 py-1">
          <div
            draggable
            onMouseDown={() => setIsGripActive(true)}
            onDragStart={(e) => {
              e.stopPropagation();
              setIsDragging(true);
              setIsGripActive(true);
              writeDragPayload(e.dataTransfer, {
                kind: 'move-block',
                blockId: block.id,
              });
            }}
            onDragEnd={() => {
              setIsDragging(false);
              setIsGripActive(false);
              clearActiveDrag();
            }}
            title="Drag to reorder block"
            aria-label="Drag to reorder block"
            className="min-h-[32px] min-w-[32px] p-1.5 flex items-center justify-center text-slate-400 hover:text-blue-700 hover:bg-blue-50 active:scale-95 rounded-md cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          {canSaveAsModule && (
            <>
              <span className="h-4 w-px bg-slate-200 mx-0.5" aria-hidden="true" />
              <button
                type="button"
                onClick={() => onSaveAsModule?.()}
                title="Save as reusable Shared Module"
                className="min-h-[32px] min-w-[32px] p-1.5 flex items-center justify-center text-slate-500 hover:text-teal-700 hover:bg-teal-50 active:scale-95 rounded-md cursor-pointer"
              >
                <Layers className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {isInstructorOnly && (
        <div className="text-[11px] font-semibold text-amber-900 flex items-center justify-between">
          <span>Instructor Only · Hidden in Student Handout</span>
          <span className="font-normal text-amber-700">Visible in Answer Key view</span>
        </div>
      )}

      {renderInnerContent()}
    </div>
  );
};
