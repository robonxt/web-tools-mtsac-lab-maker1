import React, { useState } from 'react';
import {
  AlertCircle,
  CheckSquare,
  Code2,
  Heading2,
  Layers,
  ListOrdered,
  MessageSquareText,
  Plus,
  Scissors,
  Table2,
  Type,
} from 'lucide-react';
import { LabBlockType, ReusableModule } from '../types/lab';

interface AddBlockMenuProps {
  modules: ReusableModule[];
  onInsert: (type: LabBlockType, moduleId?: string) => void;
  variant?: 'divider' | 'footer';
}

const GROUPS: Array<{
  title: string;
  items: Array<{
    type: LabBlockType;
    label: string;
    hint: string;
    icon: React.FC<{ className?: string }>;
  }>;
}> = [
  {
    title: 'Writing',
    items: [
      { type: 'heading', label: 'Section Heading', hint: 'Title or subheading', icon: Heading2 },
      { type: 'paragraph', label: 'Paragraph', hint: 'Instructions or overview', icon: Type },
      { type: 'callout', label: 'Callout Note', hint: 'Tip, caution, or prerequisite', icon: AlertCircle },
    ],
  },
  {
    title: 'Instructions',
    items: [
      { type: 'steps', label: 'Numbered Steps', hint: 'Auto-numbered procedure', icon: ListOrdered },
      { type: 'code', label: 'Code / Command', hint: 'Snippet + expected output', icon: Code2 },
      { type: 'checklist', label: 'Checklist', hint: 'Setup or verification list', icon: CheckSquare },
    ],
  },
  {
    title: 'Homework & Grading',
    items: [
      { type: 'response', label: 'Question & Answer Key', hint: 'Points + student answer lines', icon: MessageSquareText },
      { type: 'table', label: 'Table / Rubric', hint: 'Data grid or grading table', icon: Table2 },
    ],
  },
];

export const AddBlockMenu: React.FC<AddBlockMenuProps> = ({
  modules,
  onInsert,
  variant = 'divider',
}) => {
  const [open, setOpen] = useState(false);
  const [showModules, setShowModules] = useState(false);

  const pick = (type: LabBlockType, moduleId?: string) => {
    onInsert(type, moduleId);
    setOpen(false);
    setShowModules(false);
  };

  return (
    <div
      className={`relative ${
        variant === 'divider'
          ? 'group/ins h-4 -my-1.5 flex items-center justify-center'
          : 'mt-8 pt-2 flex justify-center'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {variant === 'divider' ? (
        <div className="w-full flex items-center gap-2 opacity-0 group-hover/ins:opacity-100 focus-within:opacity-100 transition-opacity">
          <span className="flex-1 h-px bg-blue-200/80" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add here
          </button>
          <span className="flex-1 h-px bg-blue-200/80" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full py-3 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-700 border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 rounded-md transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Section
        </button>
      )}

      {open && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-40 w-[440px] max-w-[92vw] bg-white border border-slate-200 rounded-lg shadow-xl p-3 space-y-3 ${
            variant === 'footer' ? 'bottom-full mb-2' : 'top-full mt-1.5'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-800">
              {showModules ? 'Insert Linked Module' : 'Add Section to Page'}
            </span>
            <div className="flex items-center gap-2">
              {showModules && (
                <button
                  type="button"
                  onClick={() => setShowModules(false)}
                  className="text-[11px] font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowModules(false);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {showModules ? (
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {modules.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No shared modules yet. Create them in Course Setup.
                </p>
              ) : (
                modules.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => pick('moduleRef', mod.id)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-teal-50/70 transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-900">{mod.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {mod.category} · {mod.blocks.length} block{mod.blocks.length === 1 ? '' : 's'}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="px-1.5 text-[11px] font-medium text-slate-400">
                      {group.title}
                    </div>
                    {group.items.map(({ type, label, hint, icon: Icon }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => pick(type)}
                        className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 text-left transition-colors cursor-pointer"
                      >
                        <Icon className="w-3.5 h-3.5 text-blue-700 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-900 leading-tight">
                            {label}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{hint}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}

                {/* Shared & Print group */}
                <div className="space-y-1">
                  <div className="px-1.5 text-[11px] font-medium text-slate-400">
                    Shared &amp; Print
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModules(true)}
                    className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-teal-50/60 text-left transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-teal-700 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 leading-tight">
                        Linked Module
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Reuse synced course section
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => pick('pageBreak')}
                    className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 text-left transition-colors cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 leading-tight">
                        Page Break
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Start a fresh printed page
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
