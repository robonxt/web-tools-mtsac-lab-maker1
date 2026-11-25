import React from 'react';
import {
  AlertCircle,
  CheckSquare,
  Code2,
  GripVertical,
  Heading2,
  ImageIcon,
  Layers,
  ListOrdered,
  MessageSquareText,
  Scissors,
  Settings2,
  Sigma,
  Table2,
  Type,
} from 'lucide-react';
import { LabBlockType, ReusableModule } from '../types/lab';
import { clearActiveDrag, writeDragPayload } from '../lib/dnd';
import { DrawerShell } from './DrawerShell';

interface InsertDrawerProps {
  modules: ReusableModule[];
  onInsert: (type: LabBlockType, moduleId?: string) => void;
  onManageModules: () => void;
  onClose: () => void;
}

const BLOCK_TILES: Array<{
  type: LabBlockType;
  label: string;
  hint: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { type: 'heading', label: 'Heading', hint: 'Section title', icon: Heading2 },
  { type: 'paragraph', label: 'Text', hint: 'Paragraph copy', icon: Type },
  { type: 'steps', label: 'Steps', hint: 'Numbered guide', icon: ListOrdered },
  { type: 'code', label: 'Code', hint: 'Snippet & output', icon: Code2 },
  { type: 'image', label: 'Figure', hint: 'Image or diagram', icon: ImageIcon },
  { type: 'math', label: 'Equation', hint: 'LaTeX formula', icon: Sigma },
  { type: 'callout', label: 'Note', hint: 'Tip or caution', icon: AlertCircle },
  { type: 'checklist', label: 'Checklist', hint: 'Checkboxes', icon: CheckSquare },
  { type: 'response', label: 'Question', hint: 'Prompt & key', icon: MessageSquareText },
  { type: 'table', label: 'Table', hint: 'Grid or rubric', icon: Table2 },
  { type: 'pageBreak', label: 'Page Break', hint: 'Start new page', icon: Scissors },
];

export const InsertDrawer: React.FC<InsertDrawerProps> = ({
  modules,
  onInsert,
  onManageModules,
  onClose,
}) => {
  return (
    <DrawerShell
      side="left"
      title="Insert"
      subtitle="Drag onto page or click to add"
      onClose={onClose}
      closeLabel="Close insert panel"
    >

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
        {/* Core Blocks 2-Column Grid */}
        <section className="space-y-2">
          <div className="px-0.5 text-[11px] font-semibold text-slate-500">
            Blocks
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_TILES.map(({ type, label, hint, icon: Icon }) => (
              <button
                key={type}
                type="button"
                draggable
                onDragStart={(e) => {
                  writeDragPayload(e.dataTransfer, {
                    kind: 'new-block',
                    blockType: type,
                  });
                }}
                onDragEnd={clearActiveDrag}
                onClick={() => onInsert(type)}
                title={`Drag onto page or click to add ${label}`}
                className="group relative flex flex-col items-start gap-1.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 active:scale-[0.98] transition-all text-left cursor-grab active:cursor-grabbing"
              >
                <div className="w-full flex items-center justify-between">
                  <span className="w-7 h-7 rounded-md bg-slate-100 group-hover:bg-blue-100/80 text-slate-700 group-hover:text-blue-700 flex items-center justify-center transition-colors">
                    <Icon className="w-4 h-4" />
                  </span>
                  <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="min-w-0 w-full">
                  <div className="text-xs font-semibold text-slate-900 leading-tight truncate">
                    {label}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {hint}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Reusable Shared Modules */}
        <section className="pt-4 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-semibold text-slate-500">
              Shared Modules
            </span>
            <button
              type="button"
              onClick={onManageModules}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline cursor-pointer"
            >
              <Settings2 className="w-3 h-3" />
              Manage
            </button>
          </div>

          {modules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center space-y-1.5">
              <p className="text-xs text-slate-500">No shared modules yet.</p>
              <button
                type="button"
                onClick={onManageModules}
                className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
              >
                Create in Course Setup
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    writeDragPayload(e.dataTransfer, {
                      kind: 'new-block',
                      blockType: 'moduleRef',
                      moduleId: mod.id,
                    });
                  }}
                  onDragEnd={clearActiveDrag}
                  onClick={() => onInsert('moduleRef', mod.id)}
                  title={`Drag onto page or click to insert "${mod.title}"`}
                  className="group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/40 active:scale-[0.99] transition-all text-left cursor-grab active:cursor-grabbing"
                >
                  <span className="w-7 h-7 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {mod.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate tabular-nums">
                      {mod.category} · {mod.blocks.length}{' '}
                      {mod.blocks.length === 1 ? 'block' : 'blocks'}
                    </div>
                  </div>
                  <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-500 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </DrawerShell>
  );
};
