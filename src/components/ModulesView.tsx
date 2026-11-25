import React, { useState } from 'react';
import {
  AlertCircle,
  CheckSquare,
  Code2,
  ImageIcon,
  Layers,
  ListOrdered,
  Plus,
  Sigma,
  Table2,
  Trash2,
  Type,
} from 'lucide-react';
import {
  Course,
  LabBlock,
  LabBlockType,
  LabDocument,
  LayoutProfile,
  ReusableModule,
} from '../types/lab';
import { cloneBlockWithFreshIds, createDefaultBlock, createId } from '../lib/blockFactory';
import { BlockView } from './BlockView';

interface ModulesViewProps {
  modules: ReusableModule[];
  labs: LabDocument[];
  courses: Course[];
  defaultLayout: LayoutProfile;
  globalVariables: Record<string, string>;
  initialModuleId?: string | null;
  onSaveModule: (updated: ReusableModule) => void;
  onCreateModule: (mod: ReusableModule) => void;
  onDeleteModule: (moduleId: string) => void;
  onOpenLab: (labId: string) => void;
}

const MODULE_BLOCK_TYPES: Array<{
  type: LabBlockType;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { type: 'callout', label: 'Callout', icon: AlertCircle },
  { type: 'paragraph', label: 'Paragraph', icon: Type },
  { type: 'checklist', label: 'Checklist', icon: CheckSquare },
  { type: 'steps', label: 'Steps', icon: ListOrdered },
  { type: 'code', label: 'Code', icon: Code2 },
  { type: 'image', label: 'Figure', icon: ImageIcon },
  { type: 'math', label: 'Equation', icon: Sigma },
  { type: 'table', label: 'Table', icon: Table2 },
];

export const ModulesView: React.FC<ModulesViewProps> = ({
  modules,
  labs,
  courses,
  defaultLayout,
  globalVariables,
  initialModuleId,
  onSaveModule,
  onCreateModule,
  onDeleteModule,
  onOpenLab,
}) => {
  const [activeId, setActiveId] = useState<string>(
    initialModuleId || modules[0]?.id || ''
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const activeModule = modules.find((m) => m.id === activeId) || modules[0];

  const getLinkedLabs = (moduleId: string) =>
    labs.filter((lab) =>
      lab.blocks.some((b) => b.type === 'moduleRef' && b.moduleId === moduleId)
    );

  const handleNewModule = () => {
    const mod: ReusableModule = {
      id: createId('mod'),
      title: 'Untitled Shared Module',
      category: 'General Policy',
      description: 'Reusable section linked across multiple labs.',
      updatedAt: new Date().toISOString(),
      blocks: [createDefaultBlock('callout')],
    };
    onCreateModule(mod);
    setActiveId(mod.id);
    setSelectedBlockId(mod.blocks[0].id);
  };

  const updateActiveBlocks = (nextBlocks: LabBlock[]) => {
    if (!activeModule) return;
    onSaveModule({
      ...activeModule,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#F1F5F9]">
      {/* Left Module List */}
      <aside className="w-[300px] shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-slate-900">Reusable Modules</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit once, sync across linked labs
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewModule}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {modules.map((mod) => {
            const linked = getLinkedLabs(mod.id);
            const selected = activeModule?.id === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  setActiveId(mod.id);
                  setSelectedBlockId(null);
                }}
                className={`w-full text-left p-3 rounded-md border transition-colors cursor-pointer ${
                  selected
                    ? 'bg-blue-50/70 border-blue-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900">{mod.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  {mod.category} · {mod.blocks.length} blocks · Linked in {linked.length} lab
                  {linked.length === 1 ? '' : 's'}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Master Module Editor */}
      <main className="flex-1 overflow-y-auto p-8">
        {!activeModule ? (
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <h2 className="text-base font-semibold text-slate-900">No Reusable Modules</h2>
            <p className="text-sm text-slate-500">
              Create shared setup blocks, SSH login guides, or submission policies once and link them across your courses.
            </p>
            <button
              type="button"
              onClick={handleNewModule}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Module
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Metadata Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="md:col-span-2 block space-y-1">
                    <span className="text-xs font-medium text-slate-500">Module Title</span>
                    <input
                      type="text"
                      value={activeModule.title}
                      onChange={(e) =>
                        onSaveModule({
                          ...activeModule,
                          title: e.target.value,
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="w-full text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-slate-500">Category</span>
                    <input
                      type="text"
                      value={activeModule.category}
                      onChange={(e) =>
                        onSaveModule({
                          ...activeModule,
                          category: e.target.value,
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteModule(activeModule.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md cursor-pointer mt-5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-500">Description</span>
                <input
                  type="text"
                  value={activeModule.description}
                  onChange={(e) =>
                    onSaveModule({
                      ...activeModule,
                      description: e.target.value,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </label>

              {/* Linked Labs Usage List */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs font-medium text-slate-500 mb-2">
                  Currently linked in ({getLinkedLabs(activeModule.id).length})
                </div>
                {getLinkedLabs(activeModule.id).length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Not linked in any lab yet. Insert it from the Editor toolbar or Inspector.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3 text-xs">
                    {getLinkedLabs(activeModule.id).map((lab) => {
                      const course = courses.find((c) => c.id === lab.courseId);
                      return (
                        <button
                          key={lab.id}
                          type="button"
                          onClick={() => onOpenLab(lab.id)}
                          className="text-blue-700 hover:underline font-medium cursor-pointer"
                        >
                          {course?.code} · {lab.labNumber}: {lab.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Module Blocks Canvas */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-800">
                  Master Content Blocks (click any block to edit)
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {MODULE_BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const created = createDefaultBlock(type);
                        updateActiveBlocks([...activeModule.blocks, created]);
                        setSelectedBlockId(created.id);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors cursor-pointer"
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5" onClick={() => setSelectedBlockId(null)}>
                {activeModule.blocks.map((blk, idx) => (
                  <BlockView
                    key={blk.id}
                    block={blk}
                    index={idx}
                    totalBlocks={activeModule.blocks.length}
                    isSelected={selectedBlockId === blk.id}
                    audienceMode="instructor"
                    layout={defaultLayout}
                    variables={globalVariables}
                    showRawTokens={true}
                    modules={modules}
                    onSelect={() => setSelectedBlockId(blk.id)}
                    onChange={(updated) =>
                      updateActiveBlocks(
                        activeModule.blocks.map((b) => (b.id === blk.id ? updated : b))
                      )
                    }
                    onMove={(dir) => {
                      const target = idx + dir;
                      if (target < 0 || target >= activeModule.blocks.length) return;
                      const next = [...activeModule.blocks];
                      [next[idx], next[target]] = [next[target], next[idx]];
                      updateActiveBlocks(next);
                    }}
                    onDuplicate={() => {
                      const next = [...activeModule.blocks];
                      next.splice(idx + 1, 0, cloneBlockWithFreshIds(blk));
                      updateActiveBlocks(next);
                    }}
                    onDelete={() => {
                      if (activeModule.blocks.length <= 1) return;
                      updateActiveBlocks(activeModule.blocks.filter((b) => b.id !== blk.id));
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
