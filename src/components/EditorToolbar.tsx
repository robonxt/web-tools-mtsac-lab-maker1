import React from 'react';
import { PanelLeft, SlidersHorizontal, Undo2 } from 'lucide-react';
import { AudienceMode } from '../types/lab';

interface EditorToolbarProps {
  courseCode?: string;
  labNumber: string;
  labTitle: string;
  audienceMode: AudienceMode;
  onChangeAudience: (mode: AudienceMode) => void;
  showDocumentsDrawer: boolean;
  onToggleDocumentsDrawer: () => void;
  showDetailsDrawer: boolean;
  onToggleDetailsDrawer: () => void;
  canUndo: boolean;
  onUndo: () => void;
  instructorHiddenCount: number;
  savedLabel: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  courseCode,
  labNumber,
  labTitle,
  audienceMode,
  onChangeAudience,
  showDocumentsDrawer,
  onToggleDocumentsDrawer,
  showDetailsDrawer,
  onToggleDetailsDrawer,
  canUndo,
  onUndo,
  instructorHiddenCount,
  savedLabel,
}) => {
  return (
    <div className="h-[46px] bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-4 shrink-0 select-none">
      {/* Left: Documents Drawer Toggle, Active Breadcrumb & Undo */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleDocumentsDrawer}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            showDocumentsDrawer
              ? 'bg-slate-100 border-slate-300 text-slate-900'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <PanelLeft className="w-3.5 h-3.5 text-slate-500" />
          Documents
        </button>

        <span className="h-4 w-px bg-slate-200 shrink-0" aria-hidden="true" />

        <div className="text-xs text-slate-500 truncate min-w-0">
          {courseCode && <span className="font-semibold text-slate-700">{courseCode}</span>}
          {courseCode && <span className="mx-1.5 text-slate-300">/</span>}
          <span className="text-slate-900 font-medium">{labNumber}</span>
          <span className="mx-1.5 text-slate-300">·</span>
          <span className="text-slate-600">{labTitle}</span>
        </div>

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last change"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Undo
        </button>
      </div>

      {/* Right: Audience Toggle, Save Status & Details Drawer Toggle */}
      <div className="flex items-center gap-3 shrink-0">
        {audienceMode === 'student' && instructorHiddenCount > 0 && (
          <span className="text-[11px] text-slate-400 whitespace-nowrap tabular-nums hidden lg:inline">
            {instructorHiddenCount} instructor note{instructorHiddenCount > 1 ? 's' : ''} hidden
          </span>
        )}

        <div
          role="group"
          aria-label="Document edition"
          className="inline-flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200/80"
        >
          <button
            type="button"
            onClick={() => onChangeAudience('student')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              audienceMode === 'student'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Student Handout
          </button>
          <button
            type="button"
            onClick={() => onChangeAudience('instructor')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              audienceMode === 'instructor'
                ? 'bg-amber-50 text-amber-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Instructor Key
          </button>
        </div>

        <span className="text-[11px] text-slate-400 whitespace-nowrap hidden md:inline">
          {savedLabel}
        </span>

        <button
          type="button"
          onClick={onToggleDetailsDrawer}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            showDetailsDrawer
              ? 'bg-slate-100 border-slate-300 text-slate-900'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          Details
        </button>
      </div>
    </div>
  );
};
