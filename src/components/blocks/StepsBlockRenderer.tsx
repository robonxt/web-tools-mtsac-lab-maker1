import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { BlockSlice, LayoutProfile, StepsBlock } from '../../types/lab';
import { createId } from '../../lib/blockFactory';
import { InlineRichText } from '../InlineRichText';
import { FormattedTextarea } from '../FormattedTextarea';
import { AutoGrowTextarea } from '../AutoGrowTextarea';

interface StepsBlockRendererProps {
  block: StepsBlock;
  editing: boolean;
  compact: boolean;
  layout: LayoutProfile;
  variables: Record<string, string>;
  showRawTokens: boolean;
  slice?: BlockSlice;
  onChange?: (updated: StepsBlock) => void;
}

export const StepsBlockRenderer: React.FC<StepsBlockRendererProps> = ({
  block,
  editing,
  compact,
  layout,
  variables,
  showRawTokens,
  slice,
  onChange,
}) => {
  if (editing && onChange) {
    const updateStep = (stepIdx: number, patch: Partial<StepsBlock['items'][number]>) => {
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
        <div className="flex items-start gap-3">
          <AutoGrowTextarea
            value={block.title}
            onChange={(val) => onChange({ ...block, title: val })}
            placeholder="Procedure section title..."
            ariaLabel="Procedure section title"
            singleLineWrap
            className="flex-1 min-w-0 text-[16px] font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:bg-white focus:border-blue-600"
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 pt-0.5">
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
              <div className="flex items-start gap-2">
                <span
                  className="font-mono text-xs font-semibold tabular-nums shrink-0 pt-1.5"
                  style={{ color: layout.accentColor }}
                >
                  Step {String(block.startNumber + idx).padStart(2, '0')}
                </span>
                <AutoGrowTextarea
                  value={item.title}
                  onChange={(val) => updateStep(idx, { title: val })}
                  placeholder="Step title..."
                  ariaLabel={`Step ${block.startNumber + idx} title`}
                  singleLineWrap
                  className="flex-1 min-w-0 text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
                />
                <input
                  type="text"
                  value={item.minutes || ''}
                  onChange={(e) => updateStep(idx, { minutes: e.target.value })}
                  placeholder="10 min"
                  aria-label="Estimated minutes"
                  className="w-20 font-mono text-xs text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 shrink-0"
                />
                <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
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
              <AutoGrowTextarea
                value={item.checkpoint || ''}
                onChange={(val) => updateStep(idx, { checkpoint: val })}
                placeholder="Optional verification checkpoint (leave blank to hide)..."
                ariaLabel="Verification checkpoint"
                singleLineWrap
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

  const startIdx = slice && slice.kind === 'steps' ? slice.start : 0;
  const endIdx = slice && slice.kind === 'steps' ? slice.end : block.items.length;
  const isContinuation = startIdx > 0;
  const visibleItems = block.items.slice(startIdx, endIdx);

  return (
    <div className="space-y-3">
      {(block.title || isContinuation) && (
        <h3
          data-sub-header="true"
          className="text-[16px] font-semibold text-slate-900 pb-1 border-b border-slate-200 flex items-baseline justify-between gap-2 break-words"
        >
          <span>
            <InlineRichText
              text={block.title || 'Procedure'}
              variables={variables}
              showRawTokens={showRawTokens}
            />
          </span>
          {isContinuation && (
            <span className="text-[11px] font-normal text-slate-400 shrink-0">
              (continued)
            </span>
          )}
        </h3>
      )}
      <ol className={compact ? 'space-y-2.5' : 'space-y-4'}>
        {visibleItems.map((item, offset) => {
          const globalIdx = startIdx + offset;
          const num = block.startNumber + globalIdx;
          const marker =
            layout.stepStyle === 'stepped'
              ? `Step ${String(num).padStart(2, '0')}`
              : layout.stepStyle === 'minimal'
                ? `${num}.`
                : `${num}`;

          return (
            <li
              key={item.id}
              data-sub-item-index={globalIdx}
              className="flex gap-3.5 print-break-avoid"
            >
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
                  <span className="font-semibold text-[15px] text-slate-900 break-words min-w-0">
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
                <p className="text-[14px] leading-relaxed text-slate-700 break-words">
                  <InlineRichText
                    text={item.body}
                    variables={variables}
                    showRawTokens={showRawTokens}
                  />
                </p>
                {item.checkpoint && (
                  <div className="mt-1.5 px-3 py-1.5 rounded bg-teal-50/70 border border-teal-200 text-xs text-teal-900 break-words">
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
};
