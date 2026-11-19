import React, { useState } from 'react';
import { GitCompare, Plus, Trash2 } from 'lucide-react';
import {
  Course,
  LabDocument,
  LabSnapshot,
  LayoutProfile,
  ReusableModule,
  SetupSection,
} from '../types/lab';
import { LayoutsView } from './LayoutsView';
import { VariablesView } from './VariablesView';
import { ModulesView } from './ModulesView';

interface CourseSetupViewProps {
  section: SetupSection;
  onChangeSection: (section: SetupSection) => void;
  layoutProfiles: LayoutProfile[];
  courses: Course[];
  labs: LabDocument[];
  modules: ReusableModule[];
  globalVariables: Record<string, string>;
  activeLab: LabDocument;
  activeLayout: LayoutProfile;
  focusedModuleId: string | null;
  onUpdateLayout: (profile: LayoutProfile) => void;
  onCreateLayout: (profile: LayoutProfile) => void;
  onDeleteLayout: (layoutId: string) => void;
  onAssignLayoutToCourse: (courseId: string, layoutId: string) => void;
  onUpdateGlobalVariable: (key: string, value: string) => void;
  onDeleteGlobalVariable: (key: string) => void;
  onUpdateCourseVariable: (courseId: string, key: string, value: string) => void;
  onDeleteCourseVariable: (courseId: string, key: string) => void;
  onUpdateCourseMeta: (
    courseId: string,
    patch: Partial<Pick<Course, 'semester' | 'professor'>>
  ) => void;
  onCopyToken: (key: string) => void;
  onSaveModule: (updated: ReusableModule) => void;
  onCreateModule: (mod: ReusableModule) => void;
  onDeleteModule: (moduleId: string) => void;
  onOpenLab: (labId: string) => void;
  onCreateSnapshotForLab: (labId: string, semester: string, label: string, note: string) => void;
  onOpenSnapshotDiffForLab: (lab: LabDocument, snapshot: LabSnapshot) => void;
  onDeleteSnapshotForLab: (labId: string, snapshotId: string) => void;
}

export const CourseSetupView: React.FC<CourseSetupViewProps> = ({
  section,
  layoutProfiles,
  courses,
  labs,
  modules,
  globalVariables,
  activeLab,
  activeLayout,
  focusedModuleId,
  onUpdateLayout,
  onCreateLayout,
  onDeleteLayout,
  onAssignLayoutToCourse,
  onUpdateGlobalVariable,
  onDeleteGlobalVariable,
  onUpdateCourseVariable,
  onDeleteCourseVariable,
  onUpdateCourseMeta,
  onCopyToken,
  onSaveModule,
  onCreateModule,
  onDeleteModule,
  onOpenLab,
  onCreateSnapshotForLab,
  onOpenSnapshotDiffForLab,
  onDeleteSnapshotForLab,
}) => {
  const [snapCourseFilter, setSnapCourseFilter] = useState<string>('all');
  const [capturingLabId, setCapturingLabId] = useState<string | null>(null);
  const [snapSemester, setSnapSemester] = useState('Fall 2026');
  const [snapLabel, setSnapLabel] = useState('');
  const [snapNote, setSnapNote] = useState('');

  const filteredSnapshotLabs =
    snapCourseFilter === 'all'
      ? labs
      : labs.filter((l) => l.courseId === snapCourseFilter);

  const handleCaptureSubmit = (e: React.FormEvent, lab: LabDocument) => {
    e.preventDefault();
    const label = snapLabel.trim() || `${snapSemester.trim()} Release`;
    onCreateSnapshotForLab(lab.id, snapSemester.trim() || 'Fall 2026', label, snapNote.trim());
    setCapturingLabId(null);
    setSnapLabel('');
    setSnapNote('');
  };

  return (
    <div className="flex-1 flex h-full min-h-0 overflow-hidden bg-[#F1F5F9]">
      {/* Active Setup Content (navigation lives in the unified top WorkspaceBar) */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {section === 'layouts' && (
          <LayoutsView
            layoutProfiles={layoutProfiles}
            activeLab={activeLab}
            courses={courses}
            modules={modules}
            globalVariables={globalVariables}
            onUpdateLayout={onUpdateLayout}
            onCreateLayout={onCreateLayout}
            onDeleteLayout={onDeleteLayout}
            onAssignLayoutToCourse={onAssignLayoutToCourse}
          />
        )}

        {section === 'variables' && (
          <VariablesView
            globalVariables={globalVariables}
            courses={courses}
            labs={labs}
            modules={modules}
            onUpdateGlobalVariable={onUpdateGlobalVariable}
            onDeleteGlobalVariable={onDeleteGlobalVariable}
            onUpdateCourseVariable={onUpdateCourseVariable}
            onDeleteCourseVariable={onDeleteCourseVariable}
            onUpdateCourseMeta={onUpdateCourseMeta}
            onCopyToken={onCopyToken}
          />
        )}

        {section === 'modules' && (
          <ModulesView
            modules={modules}
            labs={labs}
            courses={courses}
            defaultLayout={activeLayout}
            globalVariables={globalVariables}
            initialModuleId={focusedModuleId}
            onSaveModule={onSaveModule}
            onCreateModule={onCreateModule}
            onDeleteModule={onDeleteModule}
            onOpenLab={onOpenLab}
          />
        )}

        {section === 'snapshots' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    Semester Snapshots
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Freeze semester versions of your labs and homework sheets, inspect what changed, and restore safely anytime.
                  </p>
                </div>

                <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSnapCourseFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      snapCourseFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Courses
                  </button>
                  {courses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSnapCourseFilter(c.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        snapCourseFilter === c.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {filteredSnapshotLabs.map((lab) => {
                  const course = courses.find((c) => c.id === lab.courseId);
                  const isCapturing = capturingLabId === lab.id;
                  return (
                    <div
                      key={lab.id}
                      className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-500">
                            {course?.code} · {course?.professor} · {lab.blocks.length} sections
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenLab(lab.id)}
                            className="text-sm font-semibold text-slate-900 hover:text-blue-700 mt-0.5 text-left cursor-pointer"
                          >
                            {lab.labNumber}: {lab.title}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCapturingLabId(isCapturing ? null : lab.id);
                            setSnapSemester(course?.semester || 'Fall 2026');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Save Snapshot
                        </button>
                      </div>

                      {isCapturing && (
                        <form
                          onSubmit={(e) => handleCaptureSubmit(e, lab)}
                          className="border border-slate-200 rounded-md p-3.5 bg-slate-50/70 space-y-2.5"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                            <input
                              type="text"
                              value={snapSemester}
                              onChange={(e) => setSnapSemester(e.target.value)}
                              placeholder="Semester (e.g. Fall 2026)"
                              className="text-xs text-slate-900 bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
                            />
                            <input
                              type="text"
                              value={snapLabel}
                              onChange={(e) => setSnapLabel(e.target.value)}
                              placeholder="Version label (e.g. Midterm Revision)"
                              className="md:col-span-2 text-xs text-slate-900 bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
                            />
                          </div>
                          <input
                            type="text"
                            value={snapNote}
                            onChange={(e) => setSnapNote(e.target.value)}
                            placeholder="Brief note on what changed this semester..."
                            className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setCapturingLabId(null)}
                              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded cursor-pointer"
                            >
                              Capture Snapshot
                            </button>
                          </div>
                        </form>
                      )}

                      {lab.snapshots.length === 0 ? (
                        <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
                          No snapshots saved yet for this document.
                        </div>
                      ) : (
                        <div className="border-t border-slate-100 pt-3 divide-y divide-slate-100">
                          {lab.snapshots.map((snap) => (
                            <div
                              key={snap.id}
                              className="py-2.5 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-800">
                                  {snap.label}
                                </div>
                                <div className="text-[11px] text-slate-500 tabular-nums">
                                  {snap.semester} · {new Date(snap.createdAt).toLocaleDateString()} ·{' '}
                                  {snap.state.blocks.length} blocks
                                  {snap.note ? ` · ${snap.note}` : ''}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onOpenSnapshotDiffForLab(lab, snap)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-md transition-colors cursor-pointer"
                                >
                                  <GitCompare className="w-3.5 h-3.5" />
                                  Compare &amp; Restore
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteSnapshotForLab(lab.id, snap.id)}
                                  title="Delete snapshot"
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
