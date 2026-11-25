import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  FilePlus2,
  FolderPlus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Course, LabDocument, ReusableModule } from '../types/lab';

interface SidebarProps {
  courses: Course[];
  labs: LabDocument[];
  modules: ReusableModule[];
  activeLabId: string;
  onSelectLab: (labId: string) => void;
  onOpenNewLab: (courseId?: string) => void;
  onOpenNewCourse: () => void;
  onOpenRolloverCourse: (courseId: string) => void;
  onDuplicateLab: (labId: string) => void;
  onDeleteLab: (labId: string) => void;
  onJumpToBlock: (blockId: string) => void;
  onClose?: () => void;
}

const KIND_SHORT: Record<string, string> = {
  lab: 'Lab',
  homework: 'Homework',
  guide: 'Guide',
};

export const Sidebar: React.FC<SidebarProps> = ({
  courses,
  labs,
  modules,
  activeLabId,
  onSelectLab,
  onOpenNewLab,
  onOpenNewCourse,
  onOpenRolloverCourse,
  onDuplicateLab,
  onDeleteLab,
  onJumpToBlock,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [collapsedCourses, setCollapsedCourses] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeLab = labs.find((l) => l.id === activeLabId);

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
            course.professor.toLowerCase().includes(q) ||
            course.semester.toLowerCase().includes(q) ||
            course.title.toLowerCase().includes(q)))
      );
    });
  }, [labs, courses, query]);

  const outlineItems = useMemo(() => {
    if (!activeLab) return [];
    const items: Array<{ id: string; label: string; indent: boolean }> = [];
    for (const blk of activeLab.blocks) {
      if (blk.type === 'heading') {
        items.push({
          id: blk.id,
          label: blk.text || 'Untitled Heading',
          indent: blk.level > 2,
        });
      } else if (blk.type === 'steps') {
        items.push({
          id: blk.id,
          label: blk.title || `Steps (${blk.items.length})`,
          indent: false,
        });
      } else if (blk.type === 'moduleRef') {
        const mod = modules.find((m) => m.id === blk.moduleId);
        items.push({
          id: blk.id,
          label: mod ? mod.title : 'Linked Module',
          indent: true,
        });
      }
    }
    return items;
  }, [activeLab, modules]);

  const toggleCourse = (courseId: string) => {
    setCollapsedCourses((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  return (
    <aside className="w-[280px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Drawer Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-900">Files</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close files drawer"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search & Creation Controls */}
      <div className="p-3.5 border-b border-slate-200 space-y-2.5">
        <div className="relative">
          <Search
            className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, labs, homework..."
            aria-label="Search courses, labs, or homework"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenNewLab(activeLab?.courseId)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <FilePlus2 className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
            New Doc
          </button>
          <button
            type="button"
            onClick={onOpenNewCourse}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            title="Create new course"
          >
            <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
            Course
          </button>
        </div>
      </div>

      {/* Course & Document Tree */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {courses.map((course) => {
          const courseLabs = filteredLabs.filter((l) => l.courseId === course.id);
          if (query.trim() && courseLabs.length === 0) return null;
          const isCollapsed = !!collapsedCourses[course.id];

          return (
            <div key={course.id}>
              <div className="flex items-center justify-between gap-1 px-1.5 mb-1">
                <button
                  type="button"
                  onClick={() => toggleCourse(course.id)}
                  title={`${course.code} — ${course.title} (${course.semester})`}
                  className="flex items-center gap-1.5 min-w-0 text-left group cursor-pointer"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">
                      {course.code}
                      <span className="font-normal text-slate-400 mx-1">·</span>
                      <span className="font-normal text-slate-500">{course.semester}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {course.professor}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenRolloverCourse(course.id)}
                    title={`Roll over ${course.code} to next semester`}
                    aria-label={`Roll over ${course.code} to next semester`}
                    className="p-1 text-slate-400 hover:text-blue-700 rounded transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenNewLab(course.id)}
                    title={`Add document to ${course.code}`}
                    aria-label={`Add document to ${course.code}`}
                    className="p-1 text-slate-400 hover:text-blue-700 rounded transition-colors cursor-pointer"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="space-y-0.5 pl-1">
                  {courseLabs.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">No documents yet</div>
                  ) : (
                    courseLabs.map((lab) => {
                      const isActive = lab.id === activeLabId;
                      return (
                        <div
                          key={lab.id}
                          className={`group flex items-center justify-between gap-1 px-2.5 py-2 rounded-md transition-colors ${
                            isActive
                              ? 'bg-blue-50/90 text-blue-900'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteId(null);
                              onSelectLab(lab.id);
                            }}
                            className="flex-1 min-w-0 text-left cursor-pointer"
                          >
                            <div
                              className={`text-xs truncate ${
                                isActive ? 'font-semibold text-blue-900' : 'font-medium text-slate-800'
                              }`}
                            >
                              {lab.labNumber}: {lab.title}
                            </div>
                            <div className="text-[11px] text-slate-400 tabular-nums mt-0.5 truncate">
                              {KIND_SHORT[lab.docKind || 'lab'] || 'Lab'} · {lab.blocks.length}{' '}
                              sections
                            </div>
                          </button>

                          {confirmDeleteId === lab.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteLab(lab.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 text-[11px] font-medium text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onDuplicateLab(lab.id)}
                                title="Duplicate document"
                                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              {labs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(lab.id)}
                                  title="Delete document"
                                  className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredLabs.length === 0 && (
          <div className="px-3 py-6 text-center space-y-2">
            <p className="text-xs text-slate-500">No documents match “{query}”.</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Document Outline */}
      {activeLab && (
        <div className="border-t border-slate-200 px-3.5 py-3 max-h-[210px] overflow-y-auto bg-slate-50/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500">
              Page Outline
            </span>
            <span className="text-[11px] text-slate-400 tabular-nums">
              {outlineItems.length} sections
            </span>
          </div>
          {outlineItems.length === 0 ? (
            <p className="text-xs text-slate-400">Add a heading or step block to populate the outline.</p>
          ) : (
            <ul className="space-y-1">
              {outlineItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onJumpToBlock(item.id)}
                    className={`w-full text-left text-xs text-slate-600 hover:text-blue-700 truncate py-0.5 transition-colors cursor-pointer ${
                      item.indent ? 'pl-3 text-slate-500' : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
};
