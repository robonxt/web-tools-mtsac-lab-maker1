import React, { useMemo } from 'react';
import {
  AudienceMode,
  Course,
  LabBlock,
  LabBlockType,
  LabDocument,
  LayoutProfile,
  ReusableModule,
} from '../types/lab';
import { resolveVariables } from '../lib/variables';
import { BlockView } from './BlockView';
import { AddBlockMenu } from './AddBlockMenu';

interface PaperCanvasProps {
  lab: LabDocument;
  course?: Course;
  layout: LayoutProfile;
  audienceMode: AudienceMode;
  variables: Record<string, string>;
  showRawTokens: boolean;
  modules: ReusableModule[];
  selectedBlockId: string | null;
  zoom: number;
  readOnly?: boolean;
  onSelectBlock?: (blockId: string | null) => void;
  onUpdateLabMeta?: (
    patch: Partial<Pick<LabDocument, 'labNumber' | 'title' | 'subtitle' | 'estimatedTime'>>
  ) => void;
  onUpdateBlock?: (blockId: string, updated: LabBlock) => void;
  onMoveBlock?: (blockId: string, dir: -1 | 1) => void;
  onDuplicateBlock?: (blockId: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  onInsertBlockAt?: (index: number, type: LabBlockType, moduleId?: string) => void;
  onEditMasterModule?: (moduleId: string) => void;
  onDetachModule?: (blockId: string, moduleId: string) => void;
}

const KIND_LABELS: Record<string, string> = {
  lab: 'Lab Manual',
  homework: 'Homework',
  guide: 'Instruction Sheet',
};

export const PaperCanvas: React.FC<PaperCanvasProps> = ({
  lab,
  course,
  layout,
  audienceMode,
  variables,
  showRawTokens,
  modules,
  selectedBlockId,
  zoom,
  readOnly = false,
  onSelectBlock,
  onUpdateLabMeta,
  onUpdateBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onInsertBlockAt,
  onEditMasterModule,
  onDetachModule,
}) => {
  const fontClass = layout.fontFamily === 'serif' ? 'font-serif' : 'font-sans';
  const blockGap = layout.density === 'compact' ? 'space-y-4' : 'space-y-6';
  const editionLabel = audienceMode === 'instructor' ? 'Instructor Key' : 'Student Handout';
  const resolvedFooter = resolveVariables(layout.footerTemplate, variables, showRawTokens);

  const totalPoints = useMemo(
    () => lab.blocks.reduce((sum, b) => (b.type === 'response' ? sum + (b.points || 0) : sum), 0),
    [lab.blocks]
  );

  const renderDocumentHeader = () => {
    const kindLabel = KIND_LABELS[lab.docKind || 'lab'] || 'Lab Manual';
    const metaParts = [
      course?.code || 'Course',
      course?.semester || '',
      layout.professorName,
      kindLabel,
      lab.estimatedTime,
      totalPoints > 0 ? `${totalPoints} pts` : '',
      editionLabel,
    ].filter(Boolean);
    const metaLine = metaParts.join(' · ');

    const editableTitle = !readOnly && onUpdateLabMeta ? (
      <div className="flex items-baseline gap-2.5">
        <input
          type="text"
          value={lab.labNumber}
          onChange={(e) => onUpdateLabMeta({ labNumber: e.target.value })}
          aria-label="Document number"
          className="w-24 font-bold text-[24px] tracking-tight bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none shrink-0"
          style={{ color: layout.accentColor }}
        />
        <input
          type="text"
          value={lab.title}
          onChange={(e) => onUpdateLabMeta({ title: e.target.value })}
          aria-label="Document title"
          className="flex-1 font-bold text-[24px] tracking-tight text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none min-w-0"
        />
      </div>
    ) : (
      <h1 className="text-[24px] font-bold tracking-tight text-slate-900 leading-tight">
        <span style={{ color: layout.accentColor }}>{lab.labNumber}: </span>
        {resolveVariables(lab.title, variables, showRawTokens)}
      </h1>
    );

    const editableSubtitle = !readOnly && onUpdateLabMeta ? (
      <input
        type="text"
        value={lab.subtitle}
        onChange={(e) => onUpdateLabMeta({ subtitle: e.target.value })}
        placeholder="Add a brief subtitle or learning focus..."
        aria-label="Document subtitle"
        className="w-full mt-2 text-sm text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none"
      />
    ) : lab.subtitle ? (
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        {resolveVariables(lab.subtitle, variables, showRawTokens)}
      </p>
    ) : null;

    if (layout.headerVariant === 'banner') {
      return (
        <header
          className="bg-slate-50 border border-slate-200 px-6 py-5 mb-7"
          style={{ borderTopWidth: '3px', borderTopColor: layout.accentColor }}
        >
          <div className="text-xs text-slate-500 mb-2 tabular-nums">{metaLine}</div>
          {editableTitle}
          {editableSubtitle}
        </header>
      );
    }

    if (layout.headerVariant === 'grid') {
      return (
        <header className="pb-5 mb-7 border-b border-slate-300">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-500 mb-1.5">
                {course?.code} — {course?.title} · {kindLabel}
              </div>
              {editableTitle}
              {editableSubtitle}
            </div>
            <div className="w-52 shrink-0 bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700 space-y-1 tabular-nums">
              <div>
                <span className="text-slate-400">Instructor: </span>
                <span className="font-medium text-slate-900">{layout.professorName}</span>
              </div>
              <div>
                <span className="text-slate-400">Term: </span>
                <span className="font-medium text-slate-900">{course?.semester}</span>
              </div>
              <div>
                <span className="text-slate-400">Duration: </span>
                <span className="font-medium text-slate-900">{lab.estimatedTime}</span>
              </div>
              {totalPoints > 0 && (
                <div>
                  <span className="text-slate-400">Total Points: </span>
                  <span className="font-semibold text-slate-900">{totalPoints} pts</span>
                </div>
              )}
              <div>
                <span className="text-slate-400">Edition: </span>
                <span
                  className={`font-semibold ${
                    audienceMode === 'instructor' ? 'text-amber-800' : 'text-slate-900'
                  }`}
                >
                  {editionLabel}
                </span>
              </div>
            </div>
          </div>
        </header>
      );
    }

    return (
      <header
        className="pb-5 mb-7"
        style={{ borderBottomWidth: '2px', borderBottomColor: layout.accentColor }}
      >
        <div className="text-xs text-slate-500 mb-2 tabular-nums">{metaLine}</div>
        {editableTitle}
        {editableSubtitle}
      </header>
    );
  };

  const scaleFactor = zoom / 100;

  return (
    <div
      onClick={() => onSelectBlock?.(null)}
      className={readOnly ? 'w-full' : 'flex-1 overflow-y-auto bg-[#F1F5F9] px-6 py-8'}
    >
      <div
        className="mx-auto transition-transform duration-150 origin-top"
        style={
          readOnly
            ? undefined
            : {
                width: `${816 * scaleFactor}px`,
              }
        }
      >
        <article
          style={
            readOnly
              ? undefined
              : {
                  width: '816px',
                  transform: `scale(${scaleFactor})`,
                  transformOrigin: 'top left',
                }
          }
          className={`${fontClass} bg-white text-slate-900 ${
            readOnly
              ? 'w-full'
              : 'min-h-[1056px] border border-slate-200/90 shadow-sm px-14 py-12 flex flex-col'
          }`}
        >
          {/* Professor-Styled Document Header */}
          {renderDocumentHeader()}

          {/* Structured Blocks with Inline "+ Add here" Dividers */}
          <div className={`flex-1 ${blockGap}`}>
            {lab.blocks.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-200 rounded-md space-y-2">
                <p className="text-sm text-slate-500">
                  This page is blank. Click <strong>Add Section</strong> below to start writing.
                </p>
              </div>
            ) : (
              lab.blocks.map((block, idx) => (
                <React.Fragment key={block.id}>
                  {!readOnly && onInsertBlockAt && idx === 0 && (
                    <AddBlockMenu
                      variant="divider"
                      modules={modules}
                      onInsert={(type, modId) => onInsertBlockAt(0, type, modId)}
                    />
                  )}
                  <BlockView
                    block={block}
                    index={idx}
                    totalBlocks={lab.blocks.length}
                    isSelected={selectedBlockId === block.id}
                    readOnly={readOnly}
                    audienceMode={audienceMode}
                    layout={layout}
                    variables={variables}
                    showRawTokens={showRawTokens}
                    modules={modules}
                    onSelect={() => onSelectBlock?.(block.id)}
                    onChange={(updated) => onUpdateBlock?.(block.id, updated)}
                    onMove={(dir) => onMoveBlock?.(block.id, dir)}
                    onDuplicate={() => onDuplicateBlock?.(block.id)}
                    onDelete={() => onDeleteBlock?.(block.id)}
                    onEditMasterModule={onEditMasterModule}
                    onDetachModule={onDetachModule}
                  />
                  {!readOnly && onInsertBlockAt && (
                    <AddBlockMenu
                      variant="divider"
                      modules={modules}
                      onInsert={(type, modId) => onInsertBlockAt(idx + 1, type, modId)}
                    />
                  )}
                </React.Fragment>
              ))
            )}
          </div>

          {/* Primary Bottom "+ Add Section" Inserter */}
          {!readOnly && onInsertBlockAt && (
            <AddBlockMenu
              variant="footer"
              modules={modules}
              onInsert={(type, modId) => onInsertBlockAt(lab.blocks.length, type, modId)}
            />
          )}

          {/* Running Document Footer */}
          <footer className="mt-10 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
            <span>{resolvedFooter}</span>
            <span>{layout.showPageNumbers ? `${editionLabel} · Page 1` : editionLabel}</span>
          </footer>
        </article>
      </div>
    </div>
  );
};
