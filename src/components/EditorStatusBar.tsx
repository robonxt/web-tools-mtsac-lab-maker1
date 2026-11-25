import React from 'react';
import { Minus, Plus } from 'lucide-react';

const ZOOM_STEPS = [65, 75, 85, 100, 115, 125, 140];

interface EditorStatusBarProps {
  pageCount: number;
  blockCount: number;
  totalPoints: number;
  zoom: number;
  onChangeZoom: (next: number) => void;
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  pageCount,
  blockCount,
  totalPoints,
  zoom,
  onChangeZoom,
}) => {
  const stepZoom = (dir: -1 | 1) => {
    const idx = ZOOM_STEPS.findIndex((z) => z >= zoom);
    if (dir < 0) {
      const targetIdx = idx === -1 ? ZOOM_STEPS.length - 1 : Math.max(0, idx - 1);
      onChangeZoom(ZOOM_STEPS[targetIdx]);
    } else {
      const exactIdx = ZOOM_STEPS.indexOf(zoom);
      const nextIdx =
        exactIdx >= 0
          ? Math.min(ZOOM_STEPS.length - 1, exactIdx + 1)
          : idx === -1
            ? ZOOM_STEPS.length - 1
            : idx;
      onChangeZoom(ZOOM_STEPS[nextIdx]);
    }
  };

  return (
    <footer className="h-8 shrink-0 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[11px] text-slate-500 select-none">
      <div className="flex items-center gap-3 tabular-nums">
        <span>
          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
        </span>
        <span className="text-slate-300" aria-hidden="true">
          ·
        </span>
        <span>
          {blockCount} {blockCount === 1 ? 'section' : 'sections'}
        </span>
        {totalPoints > 0 && (
          <>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-medium text-slate-600">{totalPoints} pts total</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-0.5" role="group" aria-label="Zoom">
        <button
          type="button"
          onClick={() => stepZoom(-1)}
          disabled={zoom <= ZOOM_STEPS[0]}
          aria-label="Zoom out"
          title="Zoom out"
          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onChangeZoom(100)}
          title="Reset zoom to 100%"
          className="px-1.5 py-0.5 font-mono tabular-nums text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors min-w-[42px] text-center cursor-pointer"
        >
          {zoom}%
        </button>
        <button
          type="button"
          onClick={() => stepZoom(1)}
          disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          aria-label="Zoom in"
          title="Zoom in"
          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
