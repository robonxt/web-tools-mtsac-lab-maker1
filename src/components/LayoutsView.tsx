import React, { useState } from 'react';
import { Check, Copy, Plus, Trash2 } from 'lucide-react';
import {
  Course,
  DensityChoice,
  FontChoice,
  HeaderVariant,
  LabDocument,
  LayoutProfile,
  ReusableModule,
  StepStyle,
} from '../types/lab';
import { createId } from '../lib/blockFactory';
import { buildVariableMap } from '../lib/variables';
import { DEFAULT_PAGE_SETUP, formatPageSetupSummary } from '../lib/pageGeometry';
import { PageSetupControls } from './PageSetupControls';
import { PaperCanvas } from './PaperCanvas';

interface LayoutsViewProps {
  layoutProfiles: LayoutProfile[];
  activeLab: LabDocument;
  courses: Course[];
  modules: ReusableModule[];
  globalVariables: Record<string, string>;
  onUpdateLayout: (profile: LayoutProfile) => void;
  onCreateLayout: (profile: LayoutProfile) => void;
  onDeleteLayout: (layoutId: string) => void;
  onAssignLayoutToCourse: (courseId: string, layoutId: string) => void;
}

const ACCENT_PRESETS = [
  { name: 'Academic Cobalt', hex: '#1D4ED8' },
  { name: 'Forest Teal', hex: '#0F766E' },
  { name: 'Graphite Slate', hex: '#334155' },
  { name: 'Burgundy Ink', hex: '#9F1239' },
  { name: 'Ochre Amber', hex: '#B45309' },
];

export const LayoutsView: React.FC<LayoutsViewProps> = ({
  layoutProfiles,
  activeLab,
  courses,
  modules,
  globalVariables,
  onUpdateLayout,
  onCreateLayout,
  onDeleteLayout,
  onAssignLayoutToCourse,
}) => {
  const activeCourse = courses.find((c) => c.id === activeLab.courseId);
  const [selectedId, setSelectedId] = useState<string>(
    activeLab.layoutOverrideId || activeCourse?.defaultLayoutId || layoutProfiles[0]?.id || ''
  );
  const [previewZoom, setPreviewZoom] = useState<number>(80);

  const selected =
    layoutProfiles.find((p) => p.id === selectedId) || layoutProfiles[0];
  const selectedPageSetup = selected?.pageSetup || DEFAULT_PAGE_SETUP;
  const previewVariables = buildVariableMap(globalVariables, activeCourse, activeLab);

  const handleNewProfile = () => {
    const profile: LayoutProfile = {
      id: createId('layout'),
      name: 'Custom Professor Layout',
      professorName: 'Prof. New Instructor',
      department: 'Computer Science',
      headerVariant: 'editorial',
      fontFamily: 'sans',
      accentColor: '#1D4ED8',
      stepStyle: 'stepped',
      density: 'comfortable',
      showPageNumbers: true,
      footerTemplate: '{{course_code}} · {{lab_number}} · {{semester}}',
      pageSetup: { ...DEFAULT_PAGE_SETUP, margins: { ...DEFAULT_PAGE_SETUP.margins } },
    };
    onCreateLayout(profile);
    setSelectedId(profile.id);
  };

  const handleDuplicate = () => {
    if (!selected) return;
    const copy: LayoutProfile = {
      ...selected,
      id: createId('layout'),
      name: `${selected.name} (Copy)`,
    };
    onCreateLayout(copy);
    setSelectedId(copy.id);
  };

  if (!selected) return null;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#F1F5F9]">
      {/* Left Profile Selector & Controls */}
      <aside className="w-[372px] shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-slate-900">
              Professor Layout Profiles
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign once per course for consistent handouts
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewProfile}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        {/* Profile List */}
        <div className="p-3 border-b border-slate-200 space-y-1.5 max-h-40 overflow-y-auto bg-slate-50/60">
          {layoutProfiles.map((prof) => {
            const active = prof.id === selected.id;
            return (
              <button
                key={prof.id}
                type="button"
                onClick={() => setSelectedId(prof.id)}
                className={`w-full text-left px-3 py-2 rounded-md border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'bg-white border-blue-600'
                    : 'bg-white/70 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {prof.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {prof.professorName} · {prof.fontFamily === 'serif' ? 'Serif' : 'Sans'} ·{' '}
                    {prof.headerVariant}
                  </div>
                </div>
                <span
                  className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/10"
                  style={{ backgroundColor: prof.accentColor }}
                />
              </button>
            );
          })}
        </div>

        {/* Profile Form Controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Course Assignment Section */}
          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">
                Assigned Courses
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleDuplicate}
                  title="Duplicate profile"
                  className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {layoutProfiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteLayout(selected.id);
                      const fallback = layoutProfiles.find((p) => p.id !== selected.id);
                      if (fallback) setSelectedId(fallback.id);
                    }}
                    title="Delete profile"
                    className="p-1 text-slate-500 hover:text-red-600 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              {courses.map((c) => {
                const usesThis = c.defaultLayoutId === selected.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onAssignLayoutToCourse(c.id, selected.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      usesThis
                        ? 'bg-teal-50 text-teal-900 border border-teal-200 font-medium'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="truncate">
                      {c.code} · {c.professor}
                    </span>
                    {usesThis ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-teal-800 shrink-0">
                        <Check className="w-3 h-3" />
                        Default
                      </span>
                    ) : (
                      <span className="text-[11px] text-blue-700 shrink-0">Assign</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-500">Profile Name</span>
            <input
              type="text"
              value={selected.name}
              onChange={(e) => onUpdateLayout({ ...selected, name: e.target.value })}
              className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Professor Name</span>
              <input
                type="text"
                value={selected.professorName}
                onChange={(e) =>
                  onUpdateLayout({ ...selected, professorName: e.target.value })
                }
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Department</span>
              <input
                type="text"
                value={selected.department}
                onChange={(e) =>
                  onUpdateLayout({ ...selected, department: e.target.value })
                }
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
          </div>

          {/* Header Style */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500">Header Layout</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'banner', label: 'Top Banner' },
                  { id: 'editorial', label: 'Clean Rule' },
                  { id: 'grid', label: 'Info Grid' },
                ] as Array<{ id: HeaderVariant; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateLayout({ ...selected, headerVariant: opt.id })}
                  className={`py-1.5 px-2 text-xs font-medium rounded border transition-colors cursor-pointer ${
                    selected.headerVariant === opt.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500">Document Typography</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'sans', label: 'Modern Technical Sans' },
                  { id: 'serif', label: 'Classic Academic Serif' },
                ] as Array<{ id: FontChoice; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateLayout({ ...selected, fontFamily: opt.id })}
                  className={`py-1.5 px-2 text-xs font-medium rounded border transition-colors cursor-pointer ${
                    selected.fontFamily === opt.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step Style & Density */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Step Numbering</span>
              <select
                value={selected.stepStyle}
                onChange={(e) =>
                  onUpdateLayout({ ...selected, stepStyle: e.target.value as StepStyle })
                }
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5"
              >
                <option value="stepped">Step 01, Step 02</option>
                <option value="numbered">Boxed 1, 2, 3</option>
                <option value="minimal">Minimal 1., 2.</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Page Density</span>
              <select
                value={selected.density}
                onChange={(e) =>
                  onUpdateLayout({ ...selected, density: e.target.value as DensityChoice })
                }
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact Worksheet</option>
              </select>
            </label>
          </div>

          {/* Accent Color */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500">Accent Color</span>
            <div className="flex items-center gap-2">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onUpdateLayout({ ...selected, accentColor: c.hex })}
                  title={c.name}
                  className={`w-7 h-7 rounded-md border-2 transition-transform cursor-pointer ${
                    selected.accentColor.toLowerCase() === c.hex.toLowerCase()
                      ? 'border-slate-900 scale-105'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Running Footer */}
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-500">
              Footer Template (supports {`{{variables}}`})
            </span>
            <input
              type="text"
              value={selected.footerTemplate}
              onChange={(e) =>
                onUpdateLayout({ ...selected, footerTemplate: e.target.value })
              }
              className="w-full font-mono text-[11px] text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </label>

          {/* Default Page Setup */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">
                Default Paper &amp; Margins
              </span>
              <span className="text-[11px] text-slate-400">
                {formatPageSetupSummary(selectedPageSetup)}
              </span>
            </div>
            <PageSetupControls
              value={selectedPageSetup}
              onChange={(ps) => onUpdateLayout({ ...selected, pageSetup: ps })}
              compact
            />
          </div>
        </div>
      </aside>

      {/* Live Multi-Page Paper Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-4 text-xs text-slate-600 shrink-0">
          <span className="truncate">
            Live Preview — <strong className="text-slate-900">{activeLab.labNumber}: {activeLab.title}</strong> rendered with <strong className="text-slate-900">{selected.name}</strong>
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-slate-400 hidden lg:inline">
              {formatPageSetupSummary(selectedPageSetup)}
            </span>
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-md">
              {[70, 80, 100].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setPreviewZoom(z)}
                  className={`px-2 py-0.5 text-[11px] font-mono tabular-nums rounded cursor-pointer ${
                    previewZoom === z
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {z}%
                </button>
              ))}
            </div>
          </div>
        </div>
        <PaperCanvas
          lab={activeLab}
          course={activeCourse}
          layout={selected}
          pageSetup={selectedPageSetup}
          audienceMode="student"
          variables={previewVariables}
          showRawTokens={false}
          modules={modules}
          selectedBlockId={null}
          zoom={previewZoom}
          readOnly={true}
        />
      </div>
    </div>
  );
};
