import React, { useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Plus,
  Trash2,
  Unlink,
} from 'lucide-react';
import {
  AudienceMode,
  CalloutVariant,
  LabBlock,
  LayoutProfile,
  ReusableModule,
} from '../types/lab';
import { createId } from '../lib/blockFactory';
import { resolveVariables } from '../lib/variables';
import { writeDragPayload } from '../lib/dnd';
import { InlineRichText } from './InlineRichText';
import { FormattedTextarea } from './FormattedTextarea';

interface BlockViewProps {
  block: LabBlock;
  index: number;
  totalBlocks: number;
  isSelected: boolean;
  readOnly?: boolean;
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

const LANGUAGES = ['bash', 'python', 'cisco', 'powershell', 'sql', 'cpp', 'javascript', 'yaml', 'json', 'text'];

export const BlockView: React.FC<BlockViewProps> = ({
  block,
  index,
  totalBlocks,
  isSelected,
  readOnly = false,
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
  onEditMasterModule,
  onDetachModule,
}) => {
  // Hide instructor-only blocks in Student Handout view
  const checklistRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (audienceMode === 'student' && block.audience === 'instructor') {
    return null;
  }

  const isInstructorOnly = block.audience === 'instructor';
  const editing = !readOnly && isSelected;
  const compact = layout.density === 'compact';

  const renderInnerContent = () => {
    switch (block.type) {
      case 'heading': {
        const sizeClass =
          block.level === 1
            ? 'text-[22px] font-bold tracking-tight text-slate-900'
            : block.level === 2
              ? 'text-[18px] font-semibold text-slate-900 pb-1.5 border-b border-slate-200'
              : 'text-[15px] font-semibold text-slate-800';

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
              <input
                type="text"
                value={block.text}
                onChange={(e) => onChange({ ...block, text: e.target.value })}
                placeholder="Section heading..."
                className={`w-full bg-transparent focus:outline-none ${sizeClass}`}
              />
            </div>
          );
        }

        return (
          <div className={sizeClass}>
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
              rows={Math.max(3, Math.ceil(block.text.length / 82))}
              placeholder="Write instructions, overview, or homework notes..."
              className="text-[15px] leading-relaxed"
            />
          );
        }

        return (
          <p className={`${compact ? 'text-[14px]' : 'text-[15px]'} leading-relaxed text-slate-800 whitespace-pre-line`}>
            <InlineRichText
              text={block.text}
              variables={variables}
              showRawTokens={showRawTokens}
            />
          </p>
        );
      }

      case 'steps': {
        if (editing && onChange) {
          const updateStep = (stepIdx: number, patch: Partial<typeof block.items[number]>) => {
            const next = block.items.map((item, idx) =>
              idx === stepIdx ? { ...item, ...patch } : item
            );
            onChange({ ...block, items: next });
          };
          const moveStep = (stepIdx: number, dir: -1 | 1) => {
            const target = stepIdx + dir;
            if (target < 0 || target >= block.items.length) return;
            const next = [...block.items];
            [next[stepIdx], next[target]] = [next[target], next[stepIdx]];
            onChange({ ...block, items: next });
          };
          const removeStep = (stepIdx: number) => {
            if (block.items.length <= 1) return;
            onChange({ ...block, items: block.items.filter((_, idx) => idx !== stepIdx) });
          };
          const addStep = () => {
            onChange({
              ...block,
              items: [
                ...block.items,
                {
                  id: createId('stp'),
                  title: 'Next procedure step',
                  body: 'Describe the exact action students should perform.',
                  minutes: '10 min',
                  checkpoint: '',
                },
              ],
            });
          };

          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={block.title}
                  onChange={(e) => onChange({ ...block, title: e.target.value })}
                  placeholder="Procedure section title..."
                  className="flex-1 text-[16px] font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:bg-white focus:border-blue-600"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                  Start at
                  <input
                    type="number"
                    min={1}
                    value={block.startNumber}
                    onChange={(e) =>
                      onChange({ ...block, startNumber: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="w-14 font-mono tabular-nums text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1"
                  />
                </label>
              </div>

              <div className="space-y-2.5">
                {block.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-md p-3 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-xs font-semibold tabular-nums shrink-0"
                        style={{ color: layout.accentColor }}
                      >
                        Step {String(block.startNumber + idx).padStart(2, '0')}
                      </span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateStep(idx, { title: e.target.value })}
                        placeholder="Step title..."
                        className="flex-1 text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
                      />
                      <input
                        type="text"
                        value={item.minutes || ''}
                        onChange={(e) => updateStep(idx, { minutes: e.target.value })}
                        placeholder="10 min"
                        className="w-20 font-mono text-xs text-slate-600 bg-white border border-slate-200 rounded px-2 py-1"
                      />
                      <button
                        type="button"
                        onClick={() => moveStep(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move step up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(idx, 1)}
                        disabled={idx === block.items.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move step down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        disabled={block.items.length <= 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                        title="Remove step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <FormattedTextarea
                      value={item.body}
                      onChange={(next) => updateStep(idx, { body: next })}
                      variables={variables}
                      rows={2}
                      compactToolbar
                      placeholder="Step instructions..."
                      className="text-sm bg-white"
                    />
                    <input
                      type="text"
                      value={item.checkpoint || ''}
                      onChange={(e) => updateStep(idx, { checkpoint: e.target.value })}
                      placeholder="Optional verification checkpoint (leave blank to hide)..."
                      className="w-full text-xs text-teal-800 bg-white border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Step (Auto-Numbered)
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {block.title && (
              <h3 className="text-[16px] font-semibold text-slate-900 pb-1 border-b border-slate-200">
                <InlineRichText
                  text={block.title}
                  variables={variables}
                  showRawTokens={showRawTokens}
                />
              </h3>
            )}
            <ol className={compact ? 'space-y-2.5' : 'space-y-4'}>
              {block.items.map((item, idx) => {
                const num = block.startNumber + idx;
                const marker =
                  layout.stepStyle === 'stepped'
                    ? `Step ${String(num).padStart(2, '0')}`
                    : layout.stepStyle === 'minimal'
                      ? `${num}.`
                      : `${num}`;

                return (
                  <li key={item.id} className="flex gap-3.5 print-break-avoid">
                    <div
                      className={`font-mono text-xs font-semibold tabular-nums pt-0.5 shrink-0 ${
                        layout.stepStyle === 'stepped'
                          ? 'w-16'
                          : layout.stepStyle === 'numbered'
                            ? 'w-6 h-6 rounded border border-slate-200 bg-slate-50 flex items-center justify-center pt-0'
                            : 'w-6'
                      }`}
                      style={{ color: layout.accentColor }}
                    >
                      {marker}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-[15px] text-slate-900">
                          <InlineRichText
                            text={item.title}
                            variables={variables}
                            showRawTokens={showRawTokens}
                          />
                        </span>
                        {item.minutes && (
                          <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                            {item.minutes}
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] leading-relaxed text-slate-700">
                        <InlineRichText
                          text={item.body}
                          variables={variables}
                          showRawTokens={showRawTokens}
                        />
                      </p>
                      {item.checkpoint && (
                        <div className="mt-1.5 px-3 py-1.5 rounded bg-teal-50/70 border border-teal-200 text-xs text-teal-900">
                          <span className="font-semibold">Checkpoint: </span>
                          <InlineRichText
                            text={item.checkpoint}
                            variables={variables}
                            showRawTokens={showRawTokens}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      }

      case 'code': {
        if (editing && onChange) {
          return (
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                <input
                  type="text"
                  value={block.title}
                  onChange={(e) => onChange({ ...block, title: e.target.value })}
                  placeholder="Snippet title or filename..."
                  className="flex-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
                />
                <select
                  value={block.language}
                  onChange={(e) => onChange({ ...block, language: e.target.value })}
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

        return (
          <div className="border border-slate-200 rounded-md overflow-hidden print-break-avoid">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
              <span>
                {resolveVariables(block.title || 'Code Listing', variables, showRawTokens)}
              </span>
              <span className="text-slate-400">{block.language}</span>
            </div>
            <pre className="bg-slate-900 text-slate-100 font-mono text-[12.5px] leading-relaxed p-3.5 overflow-x-auto m-0">
              <code>{resolvedCode}</code>
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
      }

      case 'callout': {
        const style = CALLOUT_STYLES[block.variant];
        if (editing && onChange) {
          return (
            <div className={`rounded-md border p-3 space-y-2 ${style.bg} ${style.border}`}>
              <div className="flex items-center gap-2">
                <select
                  value={block.variant}
                  onChange={(e) =>
                    onChange({ ...block, variant: e.target.value as CalloutVariant })
                  }
                  className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded px-2 py-1"
                >
                  <option value="info">Note</option>
                  <option value="tip">Tip</option>
                  <option value="prereq">Prerequisite</option>
                  <option value="caution">Caution</option>
                </select>
                <input
                  type="text"
                  value={block.title}
                  onChange={(e) => onChange({ ...block, title: e.target.value })}
                  placeholder="Callout title..."
                  className="flex-1 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-blue-600"
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
          <div className={`rounded-md border px-4 py-3 print-break-avoid ${style.bg} ${style.border}`}>
            <div className={`text-xs font-semibold mb-1 ${style.labelColor}`}>
              <span>{style.label}</span>
              <span className="mx-1.5 opacity-50">·</span>
              <InlineRichText
                text={block.title}
                variables={variables}
                showRawTokens={showRawTokens}
              />
            </div>
            <div className="text-[14px] leading-relaxed text-slate-700">
              <InlineRichText
                text={block.body}
                variables={variables}
                showRawTokens={showRawTokens}
              />
            </div>
          </div>
        );
      }

      case 'table': {
        if (editing && onChange) {
          const updateHeader = (colIdx: number, val: string) => {
            const headers = [...block.headers];
            headers[colIdx] = val;
            onChange({ ...block, headers });
          };
          const updateCell = (rowIdx: number, colIdx: number, val: string) => {
            const rows = block.rows.map((r, rI) =>
              rI === rowIdx ? r.map((c, cI) => (cI === colIdx ? val : c)) : r
            );
            onChange({ ...block, rows });
          };
          const addRow = () => {
            onChange({
              ...block,
              rows: [...block.rows, block.headers.map(() => '')],
            });
          };
          const removeRow = (rowIdx: number) => {
            if (block.rows.length <= 1) return;
            onChange({ ...block, rows: block.rows.filter((_, idx) => idx !== rowIdx) });
          };
          const addColumn = () => {
            onChange({
              ...block,
              headers: [...block.headers, `Column ${block.headers.length + 1}`],
              rows: block.rows.map((r) => [...r, '']),
            });
          };
          const removeColumn = (colIdx: number) => {
            if (block.headers.length <= 2) return;
            onChange({
              ...block,
              headers: block.headers.filter((_, idx) => idx !== colIdx),
              rows: block.rows.map((r) => r.filter((_, idx) => idx !== colIdx)),
            });
          };

          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={block.caption}
                  onChange={(e) => onChange({ ...block, caption: e.target.value })}
                  placeholder="Table caption..."
                  className="flex-1 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:bg-white focus:border-blue-600"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={addRow}
                    className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer"
                  >
                    + Row
                  </button>
                  <button
                    type="button"
                    onClick={addColumn}
                    className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    + Column
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      {block.headers.map((h, cIdx) => (
                        <th key={cIdx} className="border-b border-r border-slate-200 p-1.5 text-left">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={h}
                              onChange={(e) => updateHeader(cIdx, e.target.value)}
                              className="w-full font-semibold text-slate-900 bg-transparent focus:outline-none"
                            />
                            {block.headers.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeColumn(cIdx)}
                                className="text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Remove column"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="w-8 border-b border-slate-200" />
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-slate-200 last:border-b-0">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="border-r border-slate-200 p-1.5">
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                              className="w-full text-slate-800 bg-transparent focus:outline-none tabular-nums"
                            />
                          </td>
                        ))}
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(rIdx)}
                            disabled={block.rows.length <= 1}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-3 h-3 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        return (
          <figure className="space-y-1.5 print-break-avoid">
            {block.caption && (
              <figcaption className="text-xs font-semibold text-slate-700">
                <InlineRichText
                  text={block.caption}
                  variables={variables}
                  showRawTokens={showRawTokens}
                />
              </figcaption>
            )}
            <div className="overflow-x-auto border border-slate-300 rounded-sm">
              <table className="w-full border-collapse text-[13px] tabular-nums">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300">
                    {block.headers.map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left font-semibold text-slate-900 border-r border-slate-200 last:border-r-0"
                      >
                        <InlineRichText
                          text={h}
                          variables={variables}
                          showRawTokens={showRawTokens}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-slate-200 last:border-b-0">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3 py-2 text-slate-700 border-r border-slate-200 last:border-r-0"
                        >
                          <InlineRichText
                            text={cell}
                            variables={variables}
                            showRawTokens={showRawTokens}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
        );
      }

      case 'response': {
        if (editing && onChange) {
          return (
            <div className="border border-slate-300 rounded-md p-3.5 bg-white space-y-2.5">
              <div className="flex items-center justify-between gap-3">
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
              <textarea
                value={block.prompt}
                onChange={(e) => onChange({ ...block, prompt: e.target.value })}
                rows={2}
                placeholder="Question or submission prompt shown to students..."
                className="w-full text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded p-2 focus:outline-none focus:bg-white focus:border-blue-600"
              />
              <div className="rounded border border-amber-200 bg-amber-50/70 p-2.5 space-y-1">
                <div className="text-[11px] font-semibold text-amber-900">
                  Instructor Answer Key &amp; Grading Rubric (Hidden in Student Handout)
                </div>
                <textarea
                  value={block.instructorSolution}
                  onChange={(e) => onChange({ ...block, instructorSolution: e.target.value })}
                  rows={2}
                  placeholder="Expected answer and grading criteria..."
                  className="w-full text-xs text-slate-800 bg-white border border-amber-200 rounded p-2 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>
          );
        }

        return (
          <div className="border border-slate-300 rounded-md p-4 bg-white print-break-avoid">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="text-[14px] font-semibold text-slate-900 leading-snug">
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
              <div className="rounded border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-[13px] text-slate-800">
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
              <input
                type="text"
                value={block.title}
                onChange={(e) => onChange({ ...block, title: e.target.value })}
                placeholder="Checklist heading..."
                className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-blue-600"
              />
              <div className="space-y-1.5">
                {block.items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-[2px] border border-slate-400 shrink-0" />
                    <input
                      ref={(el) => {
                        checklistRefs.current[item.id] = el;
                      }}
                      type="text"
                      value={item.text}
                      placeholder="Checklist item (press Enter for next)..."
                      onChange={(e) => updateItem(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          insertItemAfter(idx);
                        } else if (e.key === 'Backspace' && item.text === '' && block.items.length > 1) {
                          e.preventDefault();
                          removeItem(idx);
                        }
                      }}
                      className="flex-1 text-sm text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={block.items.length <= 1}
                      className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
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
              <div className="text-sm font-semibold text-slate-900 mb-2">
                <InlineRichText
                  text={block.title}
                  variables={variables}
                  showRawTokens={showRawTokens}
                />
              </div>
            )}
            <ul className="space-y-1.5">
              {block.items.map((item) => (
                <li key={item.id} className="flex items-start gap-2.5 text-[14px] text-slate-700">
                  <span
                    aria-hidden="true"
                    className="w-3.5 h-3.5 mt-1 rounded-[2px] border border-slate-400 shrink-0"
                  />
                  <span>
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
              readOnly
                ? ''
                : 'border border-teal-200/90 bg-teal-50/20 p-3 space-y-2.5'
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
            Instructor Only
          </div>
        )}
        {renderInnerContent()}
      </div>
    );
  }

  return (
    <div
      id={`block-${block.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className={`group relative rounded-md transition-colors ${
        isSelected
          ? 'ring-2 ring-blue-600/80 ring-offset-4 bg-white'
          : 'hover:ring-1 hover:ring-slate-300 hover:ring-offset-4'
      } ${
        isInstructorOnly
          ? 'border border-dashed border-amber-400 bg-amber-50/50 p-3.5'
          : ''
      }`}
    >
      {/* Instructor Only Indicator */}
      {isInstructorOnly && (
        <div className="text-[11px] font-semibold text-amber-900 mb-1.5 flex items-center justify-between">
          <span>Instructor Only — Hidden in Student Handout</span>
        </div>
      )}

      {/* Floating Block Controls cleanly above top border (with hover bridge so mouse transition stays open) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-full right-0 pb-2 z-20 transition-opacity ${
          isSelected
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
        }`}
      >
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-md shadow-sm px-1 py-0.5">
        <span
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            writeDragPayload(e.dataTransfer, {
              kind: 'move-block',
              blockId: block.id,
            });
          }}
          title="Drag to reorder"
          className="p-1 text-slate-400 hover:text-slate-800 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </span>
        <span className="h-3.5 w-px bg-slate-200 mx-0.5" aria-hidden="true" />
        <button
          type="button"
          onClick={() => onMove?.(-1)}
          disabled={index === 0}
          title="Move up"
          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove?.(1)}
          disabled={index === totalBlocks - 1}
          title="Move down"
          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            onChange?.({
              ...block,
              audience: block.audience === 'instructor' ? 'all' : 'instructor',
            })
          }
          title={
            isInstructorOnly
              ? 'Shown in Answer Key only — click to show to students too'
              : 'Shown to all — click to make Answer Key only'
          }
          className={`p-1 rounded cursor-pointer ${
            isInstructorOnly
              ? 'text-amber-700 bg-amber-50'
              : 'text-slate-500 hover:text-amber-700'
          }`}
        >
          {isInstructorOnly ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => onDuplicate?.()}
          title="Duplicate"
          className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete?.()}
          title="Delete"
          className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        </div>
      </div>

      {renderInnerContent()}
    </div>
  );
};
