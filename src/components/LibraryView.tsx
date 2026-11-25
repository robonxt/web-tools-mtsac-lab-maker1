import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Clock,
  Copy,
  FilePlus2,
  FileText,
  FolderPlus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { Course, LabDocument } from '../types/lab';

interface LibraryViewProps {
  courses: Course[];
  labs: LabDocument[];
  activeLabId: string;
  onOpenLab: (labId: string) => void;
  onOpenNewLab: (courseId?: string) => void;
  onOpenNewCourse: () => void;
  onOpenRolloverCourse: (courseId: string) => void;
  onDuplicateLab: (labId: string) => void;
  onDeleteLab: (labId: string) => void;
  onOpenCourseSetup: () => void;
}

const KIND_LABELS: Record<string, string> = {
  lab: 'Lab Manual',
  homework: 'Homework',
  guide: 'Guide',
};

export const LibraryView: React.FC<LibraryViewProps> = ({
  courses,
  labs,
  activeLabId,
  onOpenLab,
  onOpenNewLab,
  onOpenNewCourse,
  onOpenRolloverCourse,
  onDuplicateLab,
  onDeleteLab,
  onOpenCourseSetup,
}) => {
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredLabs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return labs;
    return labs.filter((lab) => {
      const course = courses.find((c) => c.id === lab.courseId);
      return (
        lab.title.toLowerCase().includes(q) ||
        lab.labNumber.toLowerCase().includes(q) ||
        (course &&
          (course.code.toLowerCase().includes(q) ||
            course.title.toLowerCase().includes(q) ||
            course.professor.toLowerCase().includes(q) ||
            course.semester.toLowerCase().includes(q)))
      );
    });
  }, [labs, courses, query]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F1F5F9] px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Courses &amp; Documents
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {courses.length} {courses.length === 1 ? 'course' : 'courses'} · {labs.length}{' '}
              {labs.length === 1 ? 'document' : 'documents'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenCourseSetup}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              Course Setup
            </button>
            <button
              type="button"
              onClick={onOpenNewCourse}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
              New Course
            </button>
            <button
              type="button"
              onClick={() => onOpenNewLab(courses[0]?.id)}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              New Document
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, lab numbers, titles, or semesters..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs"
          />
        </div>

        {/* Course Sections */}
        <div className="space-y-6">
          {courses.map((course) => {
            const courseLabs = filteredLabs.filter((l) => l.courseId === course.id);
            if (query.trim() && courseLabs.length === 0) return null;

            return (
              <section
                key={course.id}
                className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{course.code}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {course.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {course.semester}
                      {course.professor ? ` · ${course.professor}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenRolloverCourse(course.id)}
                      className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 rounded-md transition-colors cursor-pointer"
                      title="Roll over course to next semester"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Rollover
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenNewLab(course.id)}
                      className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      Add Doc
                    </button>
                  </div>
                </div>

                {courseLabs.length === 0 ? (
                  <div className="px-5 py-8 text-center text-xs text-slate-400">
                    No documents in this course yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {courseLabs.map((lab) => {
                      const isActive = lab.id === activeLabId;
                      const isConfirmingDelete = confirmDeleteId === lab.id;
                      return (
                        <div
                          key={lab.id}
                          className={`px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors ${
                            isActive ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onOpenLab(lab.id)}
                            className="flex-1 min-w-0 text-left flex items-center gap-3 cursor-pointer"
                          >
                            <FileText
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-blue-600' : 'text-slate-400'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-900 truncate">
                                  {lab.labNumber}: {lab.title || 'Untitled Document'}
                                </span>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                                  {KIND_LABELS[lab.docKind || 'lab'] || 'Lab'}
                                </span>
                                {isActive && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 shrink-0">
                                    Open
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                                <span>{lab.blocks.length} sections</span>
                                {lab.estimatedTime && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {lab.estimatedTime}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onDuplicateLab(lab.id)}
                              title="Duplicate document"
                              className="min-h-[32px] min-w-[32px] p-1.5 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {labs.length > 1 && (
                              isConfirmingDelete ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteLab(lab.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="min-h-[32px] px-2.5 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer"
                                >
                                  Confirm
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(lab.id)}
                                  title="Delete document"
                                  className="min-h-[32px] min-w-[32px] p-1.5 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
