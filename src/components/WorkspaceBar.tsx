import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Braces,
  ChevronDown,
  Download,
  Eye,
  FileText,
  FolderOpen,
  History,
  KeyRound,
  Layers,
  Minus,
  Palette,
  Plus,
  Printer,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';
import {
  AudienceMode,
  PageSetup,
  SetupSection,
  WorkspaceView,
} from '../types/lab';
import { formatPageSetupSummary, PAPER_SIZES } from '../lib/pageGeometry';
import { PageSetupControls } from './PageSetupControls';

export type LeftDrawerMode = 'none' | 'files' | 'insert';

const ZOOM_STEPS = [65, 75, 85, 100, 115, 125, 140];

interface WorkspaceBarProps {
  activeView: WorkspaceView;
  onChangeView: (view: WorkspaceView) => void;
  setupSection: SetupSection;
  onChangeSetupSection: (section: SetupSection) => void;
  courseCode?: string;
  labNumber: string;
  labTitle: string;
  savedLabel: string;
  leftDrawer: LeftDrawerMode;
  onToggleLeftDrawer: (mode: Exclude<LeftDrawerMode, 'none'>) => void;
  showSettingsDrawer: boolean;
  onToggleSettingsDrawer: () => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  pageSetup: PageSetup;
  pageCount: number;
  hasPageSetupOverride: boolean;
  onChangePageSetupForDoc: (next: PageSetup) => void;
  onSavePageSetupToLayout: (next: PageSetup) => void;
  onResetPageSetupOverride: () => void;
  zoom: number;
  onChangeZoom: (next: number) => void;
  audienceMode: AudienceMode;
  onChangeAudience: (mode: AudienceMode) => void;
  onQuickPrint: () => void;
  onOpenExport: () => void;
}

const SETUP_TABS: Array<{
  id: SetupSection;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'layouts', label: 'Layouts', icon: Palette },
  { id: 'variables', label: 'Variables', icon: Braces },
  { id: 'modules', label: 'Modules', icon: Layers },
  { id: 'snapshots', label: 'Snapshots', icon: History },
];

export const WorkspaceBar: React.FC<WorkspaceBarProps> = ({
  activeView,
  onChangeView,
  setupSection,
  onChangeSetupSection,
  courseCode,
  labNumber,
  labTitle,
  savedLabel,
  leftDrawer,
  onToggleLeftDrawer,
  showSettingsDrawer,
  onToggleSettingsDrawer,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  pageSetup,
  pageCount,
  hasPageSetupOverride,
  onChangePageSetupForDoc,
  onSavePageSetupToLayout,
  onResetPageSetupOverride,
  zoom,
  onChangeZoom,
  audienceMode,
  onChangeAudience,
  onQuickPrint,
  onOpenExport,
}) => {
  const [showPagePopover, setShowPagePopover] = useState(false);
  const pagePopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showPagePopover) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        pagePopoverRef.current &&
        !pagePopoverRef.current.contains(e.target as Node)
      ) {
        setShowPagePopover(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPagePopover(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPagePopover]);

  const sizeSpec = PAPER_SIZES[pageSetup.size] || PAPER_SIZES.letter;

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

  /* --------------------------- Course Setup Mode Bar --------------------------- */
  if (activeView === 'setup') {
    return (
      <header className="h-[52px] shrink-0 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-4 select-none">
        {/* Left: Brand mark + Back to Editor */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onChangeView('editor')}
            title="LabPress — Back to Editor"
            className="w-8 h-8 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            L
          </button>

          <button
            type="button"
            onClick={() => onChangeView('editor')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            Back to Lab
          </button>

          <span className="h-4 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-900 hidden sm:inline whitespace-nowrap">
            Course Setup
          </span>
        </div>

        {/* Center: Clean Setup Section Tabs */}
        <nav aria-label="Course setup sections" className="flex items-center gap-1 h-full">
          {SETUP_TABS.map(({ id, label, icon: Icon }) => {
            const active = setupSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChangeSetupSection(id)}
                className={`relative h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'text-blue-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-700 rounded-t"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Export */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </header>
    );
  }

  /* ------------------------------ Editor Mode Bar ------------------------------ */
  return (
    <header className="h-[52px] shrink-0 bg-white border-b border-slate-200 px-3 flex items-center justify-between gap-2 select-none">
      {/* Left Cluster: Brand Mark, Files, Prominent Accented + Add, Undo/Redo, Doc Name */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          onClick={() => onToggleLeftDrawer('files')}
          title="LabPress"
          className="w-8 h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center transition-colors shrink-0 cursor-pointer"
        >
          L
        </button>

        <button
          type="button"
          onClick={() => onToggleLeftDrawer('files')}
          title="Courses, documents & outline"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            leftDrawer === 'files'
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FolderOpen className="w-4 h-4 text-slate-500" />
          Files
        </button>

        {/* Prominent Accented + Add Trigger (Opens Drag-and-Drop Insert Drawer) */}
        <button
          type="button"
          onClick={() => onToggleLeftDrawer('insert')}
          title="Insert blocks or drag shared modules onto pages"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            leftDrawer === 'insert'
              ? 'bg-blue-800 text-white ring-2 ring-blue-300'
              : 'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[2.4]" />
          Add
        </button>

        <span className="h-5 w-px bg-slate-200 mx-1 shrink-0" aria-hidden="true" />

        {/* Universal Icon-Only History Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded-md transition-colors cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded-md transition-colors cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Quiet Truncated Document Breadcrumb & Save Status */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 min-w-0 ml-1.5">
          {courseCode && (
            <>
              <span className="font-semibold text-slate-700 shrink-0">{courseCode}</span>
              <span className="text-slate-300 shrink-0">/</span>
            </>
          )}
          <span className="font-medium text-slate-900 truncate max-w-[190px]" title={`${labNumber}: ${labTitle}`}>
            {labNumber}: {labTitle}
          </span>
          <span className="text-slate-300 hidden 2xl:inline shrink-0">·</span>
          <span className="text-[11px] text-slate-400 hidden 2xl:inline shrink-0">
            {savedLabel}
          </span>
        </div>
      </div>

      {/* Right / Center-Right Cluster: Page Setup, Zoom, View Mode, Quick Print, Course Setup, Settings, Export */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Page Setup Popover */}
        <div className="relative" ref={pagePopoverRef}>
          <button
            type="button"
            onClick={() => setShowPagePopover((v) => !v)}
            aria-expanded={showPagePopover}
            aria-haspopup="dialog"
            title="Paper size, orientation & margins"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
              showPagePopover
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>{sizeSpec.shortLabel}</span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-[11px] text-slate-500">{pageCount}p</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showPagePopover && (
            <div
              role="dialog"
              aria-label="Page Setup"
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900">Page Setup</div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    {formatPageSetupSummary(pageSetup)} · {sizeSpec.dimensionsLabel} · {pageCount}{' '}
                    {pageCount === 1 ? 'page' : 'pages'}
                  </div>
                </div>
                {hasPageSetupOverride && (
                  <button
                    type="button"
                    onClick={onResetPageSetupOverride}
                    title="Reset to course layout default"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              <div className="p-4">
                <PageSetupControls
                  value={pageSetup}
                  onChange={onChangePageSetupForDoc}
                  compact
                />
              </div>

              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 truncate">
                  {hasPageSetupOverride
                    ? 'Custom for this document'
                    : `Inherited from ${courseCode || 'course'} layout`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSavePageSetupToLayout(pageSetup);
                    setShowPagePopover(false);
                  }}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap cursor-pointer"
                >
                  Save as Default
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inline Zoom Controls */}
        <div
          className="hidden sm:flex items-center rounded-md hover:bg-slate-50 px-0.5 shrink-0"
          role="group"
          aria-label="Zoom"
        >
          <button
            type="button"
            onClick={() => stepZoom(-1)}
            disabled={zoom <= ZOOM_STEPS[0]}
            aria-label="Zoom out"
            title="Zoom out"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeZoom(100)}
            title="Reset zoom to 100%"
            className="px-1.5 py-1 text-[11px] font-mono tabular-nums text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors min-w-[42px] text-center cursor-pointer"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={() => stepZoom(1)}
            disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            aria-label="Zoom in"
            title="Zoom in"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="h-5 w-px bg-slate-200 mx-0.5 shrink-0" aria-hidden="true" />

        {/* Student vs Answer Key View Switcher */}
        <div
          role="group"
          aria-label="Document view"
          className="inline-flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200/80 shrink-0"
        >
          <button
            type="button"
            onClick={() => onChangeAudience('student')}
            title="Student Handout — clean copy hiding teacher notes and answer keys"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              audienceMode === 'student'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            Student
          </button>
          <button
            type="button"
            onClick={() => onChangeAudience('instructor')}
            title="Answer Key — full document with all student content plus teacher notes and solutions"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              audienceMode === 'instructor'
                ? 'bg-amber-50 text-amber-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound
              className={`w-3.5 h-3.5 ${
                audienceMode === 'instructor' ? 'text-amber-700' : 'text-slate-500'
              }`}
            />
            Answer Key
          </button>
        </div>

        <span className="h-5 w-px bg-slate-200 mx-0.5 shrink-0" aria-hidden="true" />

        {/* Course Setup Link */}
        <button
          type="button"
          onClick={() => onChangeView('setup')}
          title="Course Setup — Layouts, Variables, Shared Modules & Snapshots"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          Course
        </button>

        {/* Universal Icon-Only Quick Print & Settings */}
        <button
          type="button"
          onClick={onQuickPrint}
          aria-label="Print or Save as PDF"
          title={`Print / Save PDF (${audienceMode === 'instructor' ? 'Answer Key' : 'Student'})`}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleSettingsDrawer}
          aria-label="Document settings"
          title="Document settings & snapshots"
          className={`p-1.5 rounded-md transition-colors shrink-0 cursor-pointer ${
            showSettingsDrawer
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Primary Export Button */}
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ml-0.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    </header>
  );
};
