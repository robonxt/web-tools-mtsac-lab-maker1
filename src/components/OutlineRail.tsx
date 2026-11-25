import React, { useMemo } from 'react';
import { Heading2, Layers, ListOrdered } from 'lucide-react';
import { LabDocument, ReusableModule } from '../types/lab';
import { DrawerShell } from './DrawerShell';

interface OutlineRailProps {
  lab: LabDocument;
  modules: ReusableModule[];
  selectedBlockId: string | null;
  onJumpToBlock: (blockId: string) => void;
  onClose: () => void;
}

export const OutlineRail: React.FC<OutlineRailProps> = ({
  lab,
  modules,
  selectedBlockId,
  onJumpToBlock,
  onClose,
}) => {
  const items = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      indent: boolean;
      kind: 'heading' | 'steps' | 'module';
    }> = [];

    for (const blk of lab.blocks) {
      if (blk.type === 'heading') {
        list.push({
          id: blk.id,
          label: blk.text || 'Untitled Heading',
          indent: blk.level > 2,
          kind: 'heading',
        });
      } else if (blk.type === 'steps') {
        list.push({
          id: blk.id,
          label: blk.title || `Steps (${blk.items.length})`,
          indent: false,
          kind: 'steps',
        });
      } else if (blk.type === 'moduleRef') {
        const mod = modules.find((m) => m.id === blk.moduleId);
        list.push({
          id: blk.id,
          label: mod ? mod.title : 'Linked Module',
          indent: true,
          kind: 'module',
        });
      }
    }
    return list;
  }, [lab.blocks, modules]);

  return (
    <DrawerShell
      side="left"
      title="Document Outline"
      subtitle={`${lab.labNumber} · ${items.length} ${items.length === 1 ? 'entry' : 'entries'}`}
      onClose={onClose}
      closeLabel="Close document outline"
    >
      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-slate-400">
            Add headings or step blocks to build a navigable outline.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => {
              const isSelected = selectedBlockId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onJumpToBlock(item.id)}
                    className={`w-full text-left flex items-center gap-2 min-h-[34px] px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                      item.indent ? 'pl-6' : ''
                    } ${
                      isSelected
                        ? 'bg-blue-50 text-blue-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.kind === 'heading' ? (
                      <Heading2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : item.kind === 'steps' ? (
                      <ListOrdered className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    )}
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DrawerShell>
  );
};
