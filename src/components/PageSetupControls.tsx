import React from 'react';
import {
  MarginPreset,
  PageMargins,
  PageOrientation,
  PageSetup,
  PageSizeId,
} from '../types/lab';
import {
  clampMargin,
  MARGIN_PRESETS,
  PAPER_SIZES,
} from '../lib/pageGeometry';

interface PageSetupControlsProps {
  value: PageSetup;
  onChange: (next: PageSetup) => void;
  compact?: boolean;
}

const SIZE_ORDER: PageSizeId[] = ['letter', 'a4', 'legal', 'a5', 'tabloid'];
const PRESET_ORDER: MarginPreset[] = ['narrow', 'moderate', 'normal', 'wide', 'custom'];

export const PageSetupControls: React.FC<PageSetupControlsProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const handlePresetClick = (preset: MarginPreset) => {
    if (preset === 'custom') {
      onChange({ ...value, marginPreset: 'custom' });
      return;
    }
    onChange({
      ...value,
      marginPreset: preset,
      margins: { ...MARGIN_PRESETS[preset].margins },
    });
  };

  const handleMarginChange = (side: keyof PageMargins, raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return;
    onChange({
      ...value,
      marginPreset: 'custom',
      margins: {
        ...value.margins,
        [side]: clampMargin(parsed),
      },
    });
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Paper Size */}
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-slate-500">Paper Size</span>
        <select
          value={value.size}
          onChange={(e) =>
            onChange({ ...value, size: e.target.value as PageSizeId })
          }
          className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600 cursor-pointer"
        >
          {SIZE_ORDER.map((id) => {
            const spec = PAPER_SIZES[id];
            return (
              <option key={id} value={id}>
                {spec.label} ({spec.dimensionsLabel})
              </option>
            );
          })}
        </select>
      </label>

      {/* Orientation */}
      <div className="space-y-1">
        <span className="text-[11px] font-medium text-slate-500">Orientation</span>
        <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-100 rounded-md">
          {(
            [
              { id: 'portrait', label: 'Portrait' },
              { id: 'landscape', label: 'Landscape' },
            ] as Array<{ id: PageOrientation; label: string }>
          ).map((opt) => {
            const active = value.orientation === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...value, orientation: opt.id })}
                className={`py-1.5 px-2 text-xs font-medium rounded transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  active
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block border border-current rounded-[1px] ${
                    opt.id === 'portrait' ? 'w-2.5 h-3.5' : 'w-3.5 h-2.5'
                  }`}
                />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Margins */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500">Margins (inches)</span>
          <span className="text-[11px] font-mono tabular-nums text-slate-400">
            {value.margins.top} / {value.margins.right} / {value.margins.bottom} / {value.margins.left} in
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {PRESET_ORDER.map((preset) => {
            const active = value.marginPreset === preset;
            const label =
              preset === 'custom' ? 'Custom' : MARGIN_PRESETS[preset].label;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`py-1 px-1 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Fine-tune inputs when Custom is active (or always editable cleanly) */}
        {value.marginPreset === 'custom' && (
          <div className="grid grid-cols-4 gap-2 pt-1.5">
            {(
              [
                { key: 'top', label: 'Top' },
                { key: 'bottom', label: 'Bottom' },
                { key: 'left', label: 'Left' },
                { key: 'right', label: 'Right' },
              ] as Array<{ key: keyof PageMargins; label: string }>
            ).map(({ key, label }) => (
              <label key={key} className="block space-y-0.5">
                <span className="text-[10px] text-slate-500">{label}</span>
                <input
                  type="number"
                  step={0.05}
                  min={0.25}
                  max={2.25}
                  value={value.margins[key]}
                  onChange={(e) => handleMarginChange(key, e.target.value)}
                  className="w-full font-mono tabular-nums text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Running Header Toggle */}
      <label className="flex items-center justify-between gap-2 text-xs text-slate-600 pt-1 cursor-pointer">
        <span>Show running header on pages 2+</span>
        <input
          type="checkbox"
          checked={value.showRunningHeader}
          onChange={(e) =>
            onChange({ ...value, showRunningHeader: e.target.checked })
          }
          className="rounded border-slate-300"
        />
      </label>
    </div>
  );
};
