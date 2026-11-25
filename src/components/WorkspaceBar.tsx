import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Braces,
  Download,
  Eye,
  FolderOpen,
  History,
  KeyRound,
  Layers,
  ListTree,
  MoreHorizontal,
  Palette,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AudienceMode,
  SetupSection,
  WorkspaceView,
} from '../types/lab';
import { MissingVariableIssue } from '../lib/variables';

interface WorkspaceBarProps {
  activeView: WorkspaceView;
  onChangeView: (view: WorkspaceView) => void;
  setupSection: SetupSection;
  onChangeSetupSection: (section: SetupSection) => void;
  courseCode?: string;
  labNumber: string;
  labTitle: string;
  savedLabel: string;
  missingVariables: MissingVariableIssue[];
  onOpenVariables: () => void;
  showOutline: boolean;
  onToggleOutline: () => void;
  showDocumentSettings: boolean;
  onOpenDocumentSettings: () => void;
  hasActiveLab?: boolean;
  audienceMode: AudienceMode;
  onChangeAudience: (mode: AudienceMode) => void;
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
  missingVariables,
  onOpenVariables,
  showOutline,
  onToggleOutline,
  showDocumentSettings,
  onOpenDocumentSettings,
  hasActiveLab = true,
  audienceMode,
  onChangeAudience,
  onOpenExport,
}) => {
  const [showMissingPopover, setShowMissingPopover] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  const missingPopoverRef = useRef<HTMLDivElement | null>(null);
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMissingPopover && !showOverflowMenu) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showMissingPopover &&
        missingPopoverRef.current &&
        !missingPopoverRef.current.contains(target)
      ) {
        setShowMissingPopover(false);
      }
      if (
        showOverflowMenu &&
        overflowMenuRef.current &&
        !overflowMenuRef.current.contains(target)
      ) {
        setShowOverflowMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMissingPopover(false);
        setShowOverflowMenu(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMissingPopover, showOverflowMenu]);

  /* --------------------------- Library Mode Bar --------------------------- */
  if (activeView === 'library') {
    return (
      <header className="h-[52px] shrink-0 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-2.5 shrink-0">
          {hasActiveLab && (
            <>
              <button
                type="button"
                onClick={() => onChangeView('editor')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                Back to Editor
              </button>
              <span className="h-4 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />
            </>
          )}

          <span className="text-xs font-semibold text-slate-900 whitespace-nowrap">
            LabPress Library
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onChangeView('setup')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            Course Setup
          </button>
          {hasActiveLab && (
            <button
              type="button"
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
        </div>
      </header>
    );
  }

  /* --------------------------- Course Setup Mode Bar --------------------------- */
  if (activeView === 'setup') {
    return (
      <header className="h-[52px] shrink-0 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onChangeView(hasActiveLab ? 'editor' : 'library')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            {hasActiveLab ? 'Back to Editor' : 'Back to Library'}
          </button>

          <span className="h-4 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-900 hidden sm:inline whitespace-nowrap">
            Course Setup
          </span>
        </div>

        <nav aria-label="Course setup sections" className="flex items-center gap-1 h-full">
          {SETUP_TABS.map(({ id, label, icon: Icon }) => {
            const active = setupSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChangeSetupSection(id)}
                className={`relative h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'
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

        <div className="flex items-center gap-1.5 shrink-0">
          {hasActiveLab && (
            <button
              type="button"
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
        </div>
      </header>
    );
  }

  /* ------------------------------ Editor Mode Bar ------------------------------ */
  return (
    <header className="h-[52px] shrink-0 bg-white border-b border-slate-200 px-3 flex items-center justify-between gap-2 select-none">
      {/* Left Cluster: Library, Outline, Document Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          onClick={() => onChangeView('library')}
          title="Courses & Documents Library"
          className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-900"
        >
          <FolderOpen className="w-4 h-4 text-slate-500" />
          Library
        </button>

        <button
          type="button"
          onClick={onToggleOutline}
          title="Toggle Document Outline"
          className={`inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            showOutline
              ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ListTree className="w-4 h-4" />
          <span className="hidden sm:inline">Outline</span>
        </button>

        <span className="h-5 w-px bg-slate-200 mx-1 hidden md:block shrink-0" aria-hidden="true" />

        {/* Quiet Document Breadcrumb & Save Status */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
          {courseCode && (
            <>
              <span className="font-semibold text-slate-700 shrink-0">{courseCode}</span>
              <span className="text-slate-300 shrink-0">/</span>
            </>
          )}
          <span
            className="font-medium text-slate-900 truncate max-w-[220px]"
            title={`${labNumber}: ${labTitle}`}
          >
            {labNumber}: {labTitle}
          </span>
          <span className="text-slate-300 hidden xl:inline shrink-0">·</span>
          <span className="text-[11px] text-slate-400 hidden xl:inline shrink-0">
            {savedLabel}
          </span>
        </div>
      </div>

      {/* Right Cluster: Warnings, Audience Switcher, Course Setup, Settings, Export */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="relative" ref={missingPopoverRef}>
          <button
            type="button"
            onClick={() => setShowMissingPopover((v) => !v)}
            aria-expanded={showMissingPopover}
            aria-haspopup="dialog"
            aria-label={
              missingVariables.length > 0
                ? `${missingVariables.length} unresolved variable warnings`
                : 'No variable warnings'
            }
            title={
              missingVariables.length > 0
                ? `${missingVariables.length} unresolved variable ${missingVariables.length === 1 ? 'token' : 'tokens'}`
                : 'No unresolved variables'
            }
            className={`relative min-h-[34px] min-w-[34px] p-1.5 flex items-center justify-center rounded-md transition-colors shrink-0 cursor-pointer ${
              missingVariables.length > 0
                ? 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {missingVariables.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none flex items-center justify-center tabular-nums shadow-2xs">
                {missingVariables.length}
              </span>
            )}
          </button>

          {showMissingPopover && (
            <div
              role="dialog"
              aria-label="Variable warnings"
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-[290px] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
            >
              {missingVariables.length === 0 ? (
                <div className="p-4 text-xs text-slate-600">
                  All <code className="font-mono text-slate-800">{`{{variable}}`}</code> tokens in this document are resolved.
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-slate-200 bg-red-50/70">
                    <div className="text-xs font-semibold text-red-950">
                      Unresolved Variable Tokens
                    </div>
                    <div className="text-[11px] text-red-800 mt-0.5">
                      Define these keys before exporting handouts.
                    </div>
                  </div>
                  <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100 px-4 py-1.5">
                    {missingVariables.map((item) => (
                      <li
                        key={item.key}
                        className="py-1.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <code className="font-mono text-red-900 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded truncate">
                          {`{{${item.key}}}`}
                        </code>
                        <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                          {item.count}×
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMissingPopover(false);
                        onOpenVariables();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                    >
                      <Braces className="w-3.5 h-3.5" />
                      Define in Variables
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Student vs Answer Key Switcher */}
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

        <span className="hidden lg:block h-5 w-px bg-slate-200 mx-0.5 shrink-0" aria-hidden="true" />

        <button
          type="button"
          onClick={() => onChangeView('setup')}
          title="Course Setup — Layouts, Variables, Shared Modules & Snapshots"
          className="hidden lg:inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          Course
        </button>

        <button
          type="button"
          onClick={onOpenDocumentSettings}
          aria-label="Document settings"
          title="Document settings, page setup & snapshots"
          className={`hidden lg:inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors shrink-0 cursor-pointer ${
            showDocumentSettings
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          Settings
        </button>

        {/* Responsive Overflow Menu (< lg viewports) */}
        <div className="relative lg:hidden" ref={overflowMenuRef}>
          <button
            type="button"
            onClick={() => setShowOverflowMenu((v) => !v)}
            aria-label="More workspace tools"
            aria-expanded={showOverflowMenu}
            aria-haspopup="menu"
            className={`min-h-[34px] min-w-[34px] p-1.5 flex items-center justify-center rounded-md transition-colors shrink-0 cursor-pointer ${
              showOverflowMenu
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showOverflowMenu && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden py-1"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowOverflowMenu(false);
                  onChangeView('setup');
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                Course Setup
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowOverflowMenu(false);
                  onOpenDocumentSettings();
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                Document Settings
              </button>
            </div>
          )}
        </div>

        {/* Primary Export & Print Button */}
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ml-0.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    </header>
  );
};
