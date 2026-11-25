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

interface DocumentSettingsModalProps {
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

type SettingsTab = 'basics' | 'layout' | 'snapshots';

const DOC_KINDS: Array<{ id: DocKind; label: string }> = [
  { id: 'lab', label: 'Lab Manual' },
  { id: 'homework', label: 'Homework' },
  { id: 'guide', label: 'Instruction Sheet' },
];

export const DocumentSettingsModal: React.FC<DocumentSettingsModalProps> = ({
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

  const [activeTab, setActiveTab] = useState<SettingsTab>('basics');
  const [showSnapForm, setShowSnapForm] = useState(false);
  const [snapSemester, setSnapSemester] = useState(course?.semester || '');
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
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Document Settings"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Document Settings</h2>
            <p className="text-[11px] text-slate-500 truncate">
              {lab.labNumber}: {lab.title || 'Untitled Document'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document settings"
            className="min-h-[32px] min-w-[32px] p-1.5 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-2 border-b border-slate-200 flex items-center gap-4 bg-slate-50/60 shrink-0">
          {(
            [
              { id: 'basics', label: 'General' },
              { id: 'layout', label: 'Layout & Page' },
              { id: 'snapshots', label: `Snapshots (${lab.snapshots.length})` },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-2.5 text-xs font-medium transition-colors cursor-pointer ${
                  active ? 'text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-700 rounded-t" />
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'basics' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-slate-500">Document Type</span>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                  {DOC_KINDS.map((k) => {
                    const active = (lab.docKind || 'lab') === k.id;
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => onUpdateLab({ docKind: k.id })}
                        className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          active
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {k.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Course</span>
                <select
                  value={lab.courseId}
                  onChange={(e) => onUpdateLab({ courseId: e.target.value })}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.professor}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Label / Number</span>
                  <input
                    type="text"
                    value={lab.labNumber}
                    onChange={(e) => onUpdateLab({ labNumber: e.target.value })}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Est. Time</span>
                  <input
                    type="text"
                    value={lab.estimatedTime}
                    onChange={(e) => onUpdateLab({ estimatedTime: e.target.value })}
                    className="w-full text-xs font-mono tabular-nums text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </label>
              </div>

              <label className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-700 cursor-pointer">
                <span>Show raw {`{{variable}}`} tokens on canvas</span>
                <input
                  type="checkbox"
                  checked={showRawTokens}
                  onChange={onToggleRawTokens}
                  className="rounded border-slate-300"
                />
              </label>

              {totalPoints > 0 && (
                <div className="text-xs text-slate-600 tabular-nums pt-1">
                  Auto-totaled points: <strong className="text-slate-900">{totalPoints} pts</strong>
                </div>
              )}
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Page Layout</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCourseSetup('layouts');
                    }}
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

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
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
                    className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-600"
                  >
                    {layoutProfiles.map((lp) => (
                      <option key={lp.id} value={lp.id}>
                        {lp.name} ({lp.professorName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2.5">
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
                    className="w-full py-2 px-3 text-xs font-medium text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/80 rounded-md transition-colors cursor-pointer"
                  >
                    Save as default for {effectiveLayout.name}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'snapshots' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  Semester Snapshots
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCourseSetup('snapshots');
                  }}
                  className="text-[11px] font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  All History
                </button>
              </div>

              {!showSnapForm ? (
                <button
                  type="button"
                  onClick={() => setShowSnapForm(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Save Semester Snapshot
                </button>
              ) : (
                <form
                  onSubmit={handleSaveSnapshot}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5"
                >
                  <input
                    type="text"
                    value={snapSemester}
                    onChange={(e) => setSnapSemester(e.target.value)}
                    placeholder="Semester / Term"
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    value={snapLabel}
                    onChange={(e) => setSnapLabel(e.target.value)}
                    placeholder="Snapshot label..."
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    value={snapNote}
                    onChange={(e) => setSnapNote(e.target.value)}
                    placeholder="Optional note..."
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSnapForm(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              {lab.snapshots.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No snapshots saved for this document yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {lab.snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {snap.label}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {snap.semester} · {new Date(snap.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenSnapshotDiff(snap);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded cursor-pointer shrink-0"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        Compare
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
