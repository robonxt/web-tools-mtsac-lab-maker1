import React from 'react';
import { Download } from 'lucide-react';
import { WorkspaceView } from '../types/lab';

interface TopBarProps {
  activeView: WorkspaceView;
  onChangeView: (view: WorkspaceView) => void;
  onOpenExport: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceView; label: string }> = [
  { id: 'editor', label: 'Editor' },
  { id: 'setup', label: 'Course Setup' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onChangeView,
  onOpenExport,
}) => {
  return (
    <header className="h-[52px] shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 select-none">
      {/* Zone 1: Single-element brand wordmark */}
      <button
        type="button"
        onClick={() => onChangeView('editor')}
        className="text-[17px] font-bold tracking-tight text-slate-900 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded cursor-pointer"
      >
        LabPress
      </button>

      {/* Zone 2: Focused single-line navigation links */}
      <nav aria-label="Workspace navigation" className="flex items-center gap-8 h-full">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeView(item.id)}
              className={`relative h-full px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:text-blue-700 cursor-pointer ${
                isActive
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-700"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Export
        </button>
      </div>
    </header>
  );
};
