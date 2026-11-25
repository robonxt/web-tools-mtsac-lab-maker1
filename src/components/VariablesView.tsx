import React, { useMemo, useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Course, LabDocument, ReusableModule } from '../types/lab';
import { computeVariableUsage } from '../lib/variables';

interface VariablesViewProps {
  globalVariables: Record<string, string>;
  courses: Course[];
  labs: LabDocument[];
  modules: ReusableModule[];
  onUpdateGlobalVariable: (key: string, value: string) => void;
  onDeleteGlobalVariable: (key: string) => void;
  onUpdateCourseVariable: (courseId: string, key: string, value: string) => void;
  onDeleteCourseVariable: (courseId: string, key: string) => void;
  onUpdateCourseMeta: (courseId: string, patch: Partial<Pick<Course, 'semester' | 'professor'>>) => void;
  onCopyToken: (key: string) => void;
}

export const VariablesView: React.FC<VariablesViewProps> = ({
  globalVariables,
  courses,
  labs,
  modules,
  onUpdateGlobalVariable,
  onDeleteGlobalVariable,
  onUpdateCourseVariable,
  onDeleteCourseVariable,
  onUpdateCourseMeta,
  onCopyToken,
}) => {
  const [scope, setScope] = useState<string>('global');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const usageMap = useMemo(() => computeVariableUsage(labs, modules), [labs, modules]);

  const activeCourse = courses.find((c) => c.id === scope);
  const currentEntries = activeCourse
    ? Object.entries(activeCourse.variables)
    : Object.entries(globalVariables);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedKey = newKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, '_');
    if (!cleanedKey) return;
    if (activeCourse) {
      onUpdateCourseVariable(activeCourse.id, cleanedKey, newValue.trim());
    } else {
      onUpdateGlobalVariable(cleanedKey, newValue.trim());
    }
    setNewKey('');
    setNewValue('');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F1F5F9] p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Shared Lab Variables
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Update semester dates, VM hostnames, or runtime versions in one place to refresh every lab automatically.
            </p>
          </div>
          <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setScope('global')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scope === 'global'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Global Defaults
            </button>
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => setScope(course.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  scope === course.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {course.code}
              </button>
            ))}
          </div>
        </div>

        {/* Course built-in fields when a course is selected */}
        {activeCourse && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs font-medium text-slate-500">Course</div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">
                {activeCourse.code} — {activeCourse.title}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                {`{{course_code}}`} · {`{{course_title}}`}
              </div>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">
                Active Semester ({`{{semester}}`})
              </span>
              <input
                type="text"
                value={activeCourse.semester}
                onChange={(e) =>
                  onUpdateCourseMeta(activeCourse.id, { semester: e.target.value })
                }
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">
                Professor ({`{{professor}}`})
              </span>
              <input
                type="text"
                value={activeCourse.professor}
                onChange={(e) =>
                  onUpdateCourseMeta(activeCourse.id, { professor: e.target.value })
                }
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
          </div>
        )}

        {/* Variable Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="text-left px-4 py-3 w-56">Variable Token</th>
                <th className="text-left px-4 py-3">Current Value</th>
                <th className="text-right px-4 py-3 w-36">Usage</th>
                <th className="text-right px-4 py-3 w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400">
                    No custom variables in this scope yet. Add one below to override global defaults.
                  </td>
                </tr>
              ) : (
                currentEntries.map(([key, value]) => {
                  const usedIn = usageMap[key] || 0;
                  return (
                    <tr key={key} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-700">
                        {`{{${key}}}`}
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            activeCourse
                              ? onUpdateCourseVariable(activeCourse.id, key, e.target.value)
                              : onUpdateGlobalVariable(key, e.target.value)
                          }
                          aria-label={`Value for ${key}`}
                          className="w-full text-sm text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-600 focus:bg-white rounded px-2 py-1 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-500 tabular-nums">
                        {usedIn} lab{usedIn === 1 ? '' : 's'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onCopyToken(key)}
                            title="Copy variable token"
                            className="p-1.5 text-slate-400 hover:text-blue-700 rounded cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              activeCourse
                                ? onDeleteCourseVariable(activeCourse.id, key)
                                : onDeleteGlobalVariable(key)
                            }
                            title="Delete variable"
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Add Variable Bar */}
          <form
            onSubmit={handleAdd}
            className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3"
          >
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="variable_name"
              className="w-60 font-mono text-xs text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-600"
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              className="flex-1 min-w-[200px] text-xs text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Variable
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
