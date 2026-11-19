import React, { useMemo, useState } from 'react';
import { GitCompare, Plus, RotateCcw, X } from 'lucide-react';
import {
  Course,
  DocKind,
  LabDocument,
  LabSnapshot,
  LayoutProfile,
  PageSetup,
} from '../types/lab';
import { PageSetupControls } from './PageSetupControls';

interface DetailsDrawerProps {
  lab: LabDocument;
  courses: Course[];
  layoutProfiles: LayoutProfile[];
  effectiveLayout: LayoutProfile;
  effectivePageSetup: PageSetup;
  showRawTokens: boolean;
  onToggleRawTokens: () => void;
  onUpdateLab: (patch: Partial<LabDocument>) => void;
  onUpdatePageSetup: (next: PageSetup | null) => void;
  onSavePageSetupToLayout: (next: PageSetup) => void;
  onCreateSnapshot: (semester: string, label: string, note: string) => void;
  onOpenSnapshotDiff: (snapshot: LabSnapshot) => void;
  onOpenCourseSetup: (section: 'layouts' | 'variables' | 'modules' | 'snapshots') => void;
  onClose: () => void;
}

const DOC_KINDS: Array<{ id: DocKind; label: string }> = [
  { id: 'lab', label: 'Lab Manual' },
  { id: 'homework', label: 'Homework' },
  { id: 'guide', label: 'Instruction Sheet' },
];

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  lab,
  courses,
  layoutProfiles,
  effectiveLayout,
  effectivePageSetup,
  showRawTokens,
  onToggleRawTokens,
  onUpdateLab,
  onUpdatePageSetup,
  onSavePageSetupToLayout,
  onCreateSnapshot,
  onOpenSnapshotDiff,
  onOpenCourseSetup,
  onClose,
}) => {
  const course = courses.find((c) => c.id === lab.courseId);
  const inheritedLayout =
    layoutProfiles.find((p) => p.id === course?.defaultLayoutId) || layoutProfiles[0];
  const hasOverride = Boolean(lab.layoutOverrideId);
  const hasPageOverride = Boolean(lab.pageSetupOverride);

  const [showSnapForm, setShowSnapForm] = useState(false);
  const [snapSemester, setSnapSemester] = useState(course?.semester || 'Fall 2026');
  const [snapLabel, setSnapLabel] = useState('');
  const [snapNote, setSnapNote] = useState('');

  const totalPoints = useMemo(
    () => lab.blocks.reduce((sum, b) => (b.type === 'response' ? sum + (b.points || 0) : sum), 0),
    [lab.blocks]
  );

  const handleSaveSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const label = snapLabel.trim() || `${snapSemester.trim()} Revision`;
    onCreateSnapshot(snapSemester.trim() || 'Fall 2026', label, snapNote.trim());
    setSnapLabel('');
    setSnapNote('');
    setShowSnapForm(false);
  };

  return (
    <aside className="w-[320px] shrink-0 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-900">Document Settings</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close document settings"
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Document Info */}
        <section className="space-y-3">
          <div className="text-[11px] font-semibold text-slate-500">Basics</div>

          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-md">
            {DOC_KINDS.map((k) => {
              const active = (lab.docKind || 'lab') === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => onUpdateLab({ docKind: k.id })}
                  className={`py-1.5 px-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                    active ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {k.label}
                </button>
              );
            })}
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-500">Course</span>
            <select
              value={lab.courseId}
              onChange={(e) => onUpdateLab({ courseId: e.target.value })}
              className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.professor}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Label / Number</span>
              <input
                type="text"
                value={lab.labNumber}
                onChange={(e) => onUpdateLab({ labNumber: e.target.value })}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Est. Time</span>
              <input
                type="text"
                value={lab.estimatedTime}
                onChange={(e) => onUpdateLab({ estimatedTime: e.target.value })}
                className="w-full text-xs font-mono tabular-nums text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
          </div>

          {totalPoints > 0 && (
            <div className="text-xs text-slate-600 tabular-nums pt-1">
              Auto-totaled points: <strong className="text-slate-900">{totalPoints} pts</strong>
            </div>
          )}
        </section>

        {/* Course-Consistent Layout */}
        <section className="pt-4 border-t border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Page Layout</span>
            <button
              type="button"
              onClick={() => onOpenCourseSetup('layouts')}
              className="text-[11px] font-medium text-blue-700 hover:underline cursor-pointer"
            >
              Course Setup
            </button>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3 space-y-1">
            <div className="text-xs font-semibold text-slate-900">{effectiveLayout.name}</div>
            <div className="text-[11px] text-slate-500">
              {hasOverride
                ? 'Custom override for this document only'
                : `Inherited automatically from ${course?.code || 'course'}`}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={hasOverride}
              onChange={(e) =>
                onUpdateLab({
                  layoutOverrideId: e.target.checked ? inheritedLayout.id : null,
                })
              }
              className="rounded border-slate-300"
            />
            Use a different layout for this sheet only
          </label>

          {hasOverride && (
            <select
              value={lab.layoutOverrideId || inheritedLayout.id}
              onChange={(e) =>
                onUpdateLab({
                  layoutOverrideId: e.target.value,
                  layoutProfileId: e.target.value,
                })
              }
              className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
            >
              {layoutProfiles.map((lp) => (
                <option key={lp.id} value={lp.id}>
                  {lp.name} ({lp.professorName})
                </option>
              ))}
            </select>
          )}
        </section>

        {/* Paper Size, Orientation & Margins */}
        <section className="pt-4 border-t border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Page Setup</span>
            {hasPageOverride ? (
              <button
                type="button"
                onClick={() => onUpdatePageSetup(null)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to layout
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">From layout</span>
            )}
          </div>

          <PageSetupControls
            value={effectivePageSetup}
            onChange={(next) => onUpdatePageSetup(next)}
            compact
          />

          {hasPageOverride && (
            <button
              type="button"
              onClick={() => onSavePageSetupToLayout(effectivePageSetup)}
              className="w-full py-1.5 px-2.5 text-[11px] font-medium text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/80 rounded-md transition-colors cursor-pointer"
            >
              Save as default for {effectiveLayout.name}
            </button>
          )}
        </section>

        {/* Quick Semester Snapshots */}
        <section className="pt-4 border-t border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">
              Semester Snapshots
            </span>
            <button
              type="button"
              onClick={() => onOpenCourseSetup('snapshots')}
              className="text-[11px] font-medium text-blue-700 hover:underline cursor-pointer"
            >
              All History
            </button>
          </div>

          {!showSnapForm ? (
            <button
              type="button"
              onClick={() => setShowSnapForm(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Save Snapshot of This Sheet
            </button>
          ) : (
            <form onSubmit={handleSaveSnapshot} className="space-y-2 border border-slate-200 rounded-md p-2.5 bg-slate-50/50">
              <input
                type="text"
                value={snapSemester}
                onChange={(e) => setSnapSemester(e.target.value)}
                placeholder="Semester (e.g. Fall 2026)"
                className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
              />
              <input
                type="text"
                value={snapLabel}
                onChange={(e) => setSnapLabel(e.target.value)}
                placeholder="Snapshot name..."
                className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
              />
              <textarea
                value={snapNote}
                onChange={(e) => setSnapNote(e.target.value)}
                rows={2}
                placeholder="Optional change note..."
                className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowSnapForm(false)}
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {lab.snapshots.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {lab.snapshots.slice(0, 3).map((snap) => (
                <button
                  key={snap.id}
                  type="button"
                  onClick={() => onOpenSnapshotDiff(snap)}
                  className="w-full text-left px-2.5 py-2 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-800 truncate">
                      {snap.label}
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {snap.semester} · {new Date(snap.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <GitCompare className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Quiet Viewing Options */}
        <section className="pt-4 border-t border-slate-200 space-y-3">
          <span className="text-[11px] font-semibold text-slate-500">Options</span>

          <label className="flex items-center justify-between text-xs text-slate-600 cursor-pointer">
            <span>Highlight raw {`{{variable}}`} names</span>
            <input
              type="checkbox"
              checked={showRawTokens}
              onChange={onToggleRawTokens}
              className="rounded border-slate-300"
            />
          </label>

          <div className="pt-1 flex items-center gap-3 text-[11px]">
            <button
              type="button"
              onClick={() => onOpenCourseSetup('variables')}
              className="text-blue-700 hover:underline cursor-pointer"
            >
              Edit Variables
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => onOpenCourseSetup('modules')}
              className="text-blue-700 hover:underline cursor-pointer"
            >
              Manage Modules
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
};
