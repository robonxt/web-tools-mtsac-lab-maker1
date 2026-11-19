import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Scissors, Trash2 } from 'lucide-react';
import {
  AudienceMode,
  Course,
  LabBlock,
  LabBlockType,
  LabDocument,
  LayoutProfile,
  PageSetup,
  ReusableModule,
} from '../types/lab';
import { resolveVariables } from '../lib/variables';
import {
  computePageGeometry,
  paginateBlocks,
  resolvePageSetup,
} from '../lib/pageGeometry';
import { hasLabPressDrag, readDragPayload } from '../lib/dnd';
import { BlockView } from './BlockView';
import { AddBlockMenu } from './AddBlockMenu';

interface PaperCanvasProps {
  lab: LabDocument;
  course?: Course;
  layout: LayoutProfile;
  pageSetup?: PageSetup;
  audienceMode: AudienceMode;
  variables: Record<string, string>;
  showRawTokens: boolean;
  modules: ReusableModule[];
  selectedBlockId: string | null;
  zoom: number;
  readOnly?: boolean;
  printMode?: boolean;
  onPageCountChange?: (count: number) => void;
  onSelectBlock?: (blockId: string | null) => void;
  onUpdateLabMeta?: (
    patch: Partial<Pick<LabDocument, 'labNumber' | 'title' | 'subtitle' | 'estimatedTime'>>
  ) => void;
  onUpdateBlock?: (blockId: string, updated: LabBlock) => void;
  onMoveBlock?: (blockId: string, dir: -1 | 1) => void;
  onDuplicateBlock?: (blockId: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  onInsertBlockAt?: (index: number, type: LabBlockType, moduleId?: string) => void;
  onReorderBlock?: (blockId: string, targetIndex: number) => void;
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
  pageSetup: explicitPageSetup,
  audienceMode,
  variables,
  showRawTokens,
  modules,
  selectedBlockId,
  zoom,
  readOnly = false,
  printMode = false,
  onPageCountChange,
  onSelectBlock,
  onUpdateLabMeta,
  onUpdateBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onInsertBlockAt,
  onReorderBlock,
  onEditMasterModule,
  onDetachModule,
}) => {
  const effectivePageSetup = useMemo(
    () => explicitPageSetup || resolvePageSetup(layout, lab),
    [explicitPageSetup, layout, lab]
  );

  const geometry = useMemo(
    () => computePageGeometry(effectivePageSetup),
    [effectivePageSetup]
  );

  const fontClass = layout.fontFamily === 'serif' ? 'font-serif' : 'font-sans';
  const blockGapPx = layout.density === 'compact' ? 14 : 22;
  const editionLabel = audienceMode === 'instructor' ? 'Instructor Key' : 'Student Handout';
  const resolvedFooter = resolveVariables(layout.footerTemplate, variables, showRawTokens);

  const totalPoints = useMemo(
    () => lab.blocks.reduce((sum, b) => (b.type === 'response' ? sum + (b.points || 0) : sum), 0),
    [lab.blocks]
  );

  // Live DOM height measurement for true WYSIWYG pagination
  const headerRef = useRef<HTMLDivElement | null>(null);
  const blockNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingHeightsRef = useRef<Record<string, number> | null>(null);

  const [headerHeightPx, setHeaderHeightPx] = useState<number>(138);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const [activeDropIndex, setActiveDropIndex] = useState<number | null>(null);
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);

  // Clear drag indicator whenever any drag ends anywhere in the window
  useEffect(() => {
    const clearDrag = () => {
      setActiveDropIndex(null);
      setIsDraggingOverCanvas(false);
    };
    window.addEventListener('dragend', clearDrag);
    window.addEventListener('drop', clearDrag);
    return () => {
      window.removeEventListener('dragend', clearDrag);
      window.removeEventListener('drop', clearDrag);
    };
  }, []);

  const handleDropAtIndex = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDropIndex(null);
      setIsDraggingOverCanvas(false);
      const payload = readDragPayload(e.dataTransfer);
      if (!payload) return;
      if (payload.kind === 'new-block') {
        onInsertBlockAt?.(targetIndex, payload.blockType, payload.moduleId);
      } else if (payload.kind === 'move-block') {
        onReorderBlock?.(payload.blockId, targetIndex);
      }
    },
    [onInsertBlockAt, onReorderBlock]
  );

  const renderDropSlot = (targetIndex: number, showInlineAdd = true) => {
    if (readOnly || printMode || !onInsertBlockAt) return null;
    const isActive = activeDropIndex === targetIndex;

    return (
      <div
        onDragOver={(e) => {
          if (!hasLabPressDrag(e.dataTransfer)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
          if (activeDropIndex !== targetIndex) setActiveDropIndex(targetIndex);
          if (!isDraggingOverCanvas) setIsDraggingOverCanvas(true);
        }}
        onDragEnter={(e) => {
          if (!hasLabPressDrag(e.dataTransfer)) return;
          e.preventDefault();
          setActiveDropIndex(targetIndex);
          setIsDraggingOverCanvas(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (activeDropIndex === targetIndex) setActiveDropIndex(null);
          }
        }}
        onDrop={(e) => handleDropAtIndex(e, targetIndex)}
        className={`relative transition-all ${
          isActive
            ? 'py-2 my-1'
            : isDraggingOverCanvas
              ? 'py-1.5'
              : ''
        }`}
      >
        {isActive ? (
          <div className="flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
            <span className="flex-1 h-[2px] bg-blue-600 rounded-full" />
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap">
              Drop here
            </span>
            <span className="flex-1 h-[2px] bg-blue-600 rounded-full" />
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          </div>
        ) : showInlineAdd ? (
          <AddBlockMenu
            variant="divider"
            modules={modules}
            onInsert={(type, modId) => onInsertBlockAt(targetIndex, type, modId)}
          />
        ) : null}
      </div>
    );
  };

  const isTypingInsideSelectedBlock = useCallback(() => {
    if (!selectedBlockId || readOnly) return false;
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName;
    if (tag !== 'TEXTAREA' && tag !== 'INPUT') return false;
    const blockEl = blockNodesRef.current.get(selectedBlockId);
    return Boolean(blockEl && blockEl.contains(active));
  }, [selectedBlockId, readOnly]);

  const measureAll = useCallback(
    (force = false) => {
      const nextHeaderH = headerRef.current
        ? Math.ceil(headerRef.current.getBoundingClientRect().height)
        : headerHeightPx;

      const scale = printMode ? 1 : zoom / 100 || 1;
      const adjustedHeaderH = Math.ceil(nextHeaderH / scale);

      const nextHeights: Record<string, number> = {};
      blockNodesRef.current.forEach((node, id) => {
        // Measure unscaled logical layout height
        const rectH = node.offsetHeight || Math.ceil(node.getBoundingClientRect().height / scale);
        if (rectH > 0) {
          nextHeights[id] = rectH;
        }
      });

      if (!force && isTypingInsideSelectedBlock()) {
        pendingHeightsRef.current = nextHeights;
        return;
      }

      pendingHeightsRef.current = null;
      setHeaderHeightPx((prev) => (Math.abs(prev - adjustedHeaderH) > 2 ? adjustedHeaderH : prev));
      setMeasuredHeights((prev) => {
        let changed = false;
        const merged = { ...prev };
        for (const [id, h] of Object.entries(nextHeights)) {
          if (prev[id] === undefined || Math.abs(prev[id] - h) > 2) {
            merged[id] = h;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    },
    [headerHeightPx, isTypingInsideSelectedBlock, printMode, zoom]
  );

  // Re-measure whenever geometry, layout, audience, blocks, or modules change
  useLayoutEffect(() => {
    measureAll(true);
  }, [
    lab.id,
    lab.blocks,
    layout.fontFamily,
    layout.density,
    layout.headerVariant,
    geometry.contentWidthPx,
    audienceMode,
    showRawTokens,
    modules,
    selectedBlockId,
    measureAll,
  ]);

  // Observe dynamic resizing (e.g. font load, typing multiline, expanding modules)
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      measureAll(false);
    });
    if (headerRef.current) ro.observe(headerRef.current);
    blockNodesRef.current.forEach((node) => ro.observe(node));
    return () => ro.disconnect();
  }, [lab.blocks, audienceMode, geometry.contentWidthPx, measureAll]);

  // Flush any deferred height measurements smoothly when user finishes typing in an input/textarea
  const handleBlurCapture = useCallback(() => {
    if (pendingHeightsRef.current) {
      window.requestAnimationFrame(() => measureAll(true));
    }
  }, [measureAll]);

  const pages = useMemo(
    () =>
      paginateBlocks({
        blocks: lab.blocks,
        audienceMode,
        measuredHeights,
        headerHeightPx,
        geometry,
        blockGapPx,
      }),
    [lab.blocks, audienceMode, measuredHeights, headerHeightPx, geometry, blockGapPx]
  );

  useEffect(() => {
    onPageCountChange?.(pages.length);
  }, [pages.length, onPageCountChange]);

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
          className="w-24 font-bold text-[23px] tracking-tight bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none shrink-0"
          style={{ color: layout.accentColor }}
        />
        <input
          type="text"
          value={lab.title}
          onChange={(e) => onUpdateLabMeta({ title: e.target.value })}
          aria-label="Document title"
          className="flex-1 font-bold text-[23px] tracking-tight text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none min-w-0"
        />
      </div>
    ) : (
      <h1 className="text-[23px] font-bold tracking-tight text-slate-900 leading-tight">
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
          className="bg-slate-50 border border-slate-200 px-5 py-4 mb-6"
          style={{ borderTopWidth: '3px', borderTopColor: layout.accentColor }}
        >
          <div className="text-xs text-slate-500 mb-1.5 tabular-nums">{metaLine}</div>
          {editableTitle}
          {editableSubtitle}
        </header>
      );
    }

    if (layout.headerVariant === 'grid') {
      return (
        <header className="pb-4 mb-6 border-b border-slate-300">
          <div className="flex items-start justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-500 mb-1">
                {course?.code} — {course?.title} · {kindLabel}
              </div>
              {editableTitle}
              {editableSubtitle}
            </div>
            <div className="w-48 shrink-0 bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 space-y-0.5 tabular-nums">
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
        className="pb-4 mb-6"
        style={{ borderBottomWidth: '2px', borderBottomColor: layout.accentColor }}
      >
        <div className="text-xs text-slate-500 mb-1.5 tabular-nums">{metaLine}</div>
        {editableTitle}
        {editableSubtitle}
      </header>
    );
  };

  const scaleFactor = printMode ? 1 : zoom / 100;
  const totalPages = pages.length;

  return (
    <div
      onClick={() => onSelectBlock?.(null)}
      onBlurCapture={handleBlurCapture}
      onDragOver={(e) => {
        if (!readOnly && !printMode && hasLabPressDrag(e.dataTransfer)) {
          e.preventDefault();
          if (!isDraggingOverCanvas) setIsDraggingOverCanvas(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOverCanvas(false);
          setActiveDropIndex(null);
        }
      }}
      className={
        printMode
          ? 'w-full'
          : 'flex-1 overflow-auto bg-[#E8EEF4] px-8 py-8'
      }
    >
      <div
        className={printMode ? 'w-full' : 'mx-auto flex flex-col items-center'}
        style={
          printMode
            ? undefined
            : {
                minWidth: `${geometry.widthPx * scaleFactor}px`,
              }
        }
      >
        {pages.map((page, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === pages.length - 1;

          return (
            <React.Fragment key={`page-${page.pageNumber}`}>
              {/* Scaled physical sheet wrapper so vertical flow respects zoom accurately */}
              <div
                className={
                  printMode
                    ? isLastPage
                      ? 'print-sheet-page'
                      : 'print-sheet-page print-page-break-after'
                    : 'relative shrink-0'
                }
                style={
                  printMode
                    ? {
                        width: `${geometry.widthIn}in`,
                        minHeight: `${geometry.heightIn}in`,
                      }
                    : {
                        width: `${Math.round(geometry.widthPx * scaleFactor)}px`,
                        minHeight: `${Math.round(geometry.heightPx * scaleFactor)}px`,
                        marginBottom: isLastPage ? '0px' : '28px',
                      }
                }
              >
                {/* Quiet Page Indicator Label above each sheet (screen only) */}
                {!printMode && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums mb-1.5 px-0.5 select-none">
                    <span>
                      Page {page.pageNumber} of {totalPages}
                    </span>
                    {page.overflowsSinglePage && (
                      <span className="text-amber-700 font-medium">
                        Section taller than 1 page — consider splitting or narrowing margins
                      </span>
                    )}
                  </div>
                )}

                <article
                  style={
                    printMode
                      ? {
                          width: `${geometry.widthIn}in`,
                          minHeight: `${geometry.heightIn}in`,
                          paddingTop: `${effectivePageSetup.margins.top}in`,
                          paddingRight: `${effectivePageSetup.margins.right}in`,
                          paddingBottom: `${effectivePageSetup.margins.bottom}in`,
                          paddingLeft: `${effectivePageSetup.margins.left}in`,
                          boxSizing: 'border-box',
                        }
                      : {
                          width: `${geometry.widthPx}px`,
                          minHeight: `${geometry.heightPx}px`,
                          paddingTop: `${geometry.marginTopPx}px`,
                          paddingRight: `${geometry.marginRightPx}px`,
                          paddingBottom: `${geometry.marginBottomPx}px`,
                          paddingLeft: `${geometry.marginLeftPx}px`,
                          transform: scaleFactor !== 1 ? `scale(${scaleFactor})` : undefined,
                          transformOrigin: 'top left',
                          boxSizing: 'border-box',
                        }
                  }
                  className={`${fontClass} relative bg-white text-slate-900 flex flex-col ${
                    printMode
                      ? ''
                      : 'border border-slate-300/80 shadow-[0_2px_10px_rgba(15,23,42,0.07)]'
                  }`}
                >
                  {/* Subtle Corner Margin Guides (editor only, never printed) */}
                  {!printMode && !readOnly && (
                    <>
                      <span
                        aria-hidden="true"
                        style={{
                          top: `${Math.max(8, geometry.marginTopPx - 10)}px`,
                          left: `${Math.max(8, geometry.marginLeftPx - 10)}px`,
                        }}
                        className="pointer-events-none absolute w-2.5 h-2.5 border-r border-b border-slate-200"
                      />
                      <span
                        aria-hidden="true"
                        style={{
                          top: `${Math.max(8, geometry.marginTopPx - 10)}px`,
                          right: `${Math.max(8, geometry.marginRightPx - 10)}px`,
                        }}
                        className="pointer-events-none absolute w-2.5 h-2.5 border-l border-b border-slate-200"
                      />
                      <span
                        aria-hidden="true"
                        style={{
                          bottom: `${Math.max(8, geometry.marginBottomPx - 10)}px`,
                          left: `${Math.max(8, geometry.marginLeftPx - 10)}px`,
                        }}
                        className="pointer-events-none absolute w-2.5 h-2.5 border-r border-t border-slate-200"
                      />
                      <span
                        aria-hidden="true"
                        style={{
                          bottom: `${Math.max(8, geometry.marginBottomPx - 10)}px`,
                          right: `${Math.max(8, geometry.marginRightPx - 10)}px`,
                        }}
                        className="pointer-events-none absolute w-2.5 h-2.5 border-l border-t border-slate-200"
                      />
                    </>
                  )}

                  {/* Page 1 Document Header OR Running Header on Pages 2+ */}
                  {isFirstPage ? (
                    <div ref={headerRef}>{renderDocumentHeader()}</div>
                  ) : (
                    effectivePageSetup.showRunningHeader && (
                      <div className="pb-2 mb-4 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                        <span className="truncate">
                          {course?.code ? `${course.code} · ` : ''}
                          {lab.labNumber}: {resolveVariables(lab.title, variables, showRawTokens)}
                        </span>
                        <span className="shrink-0 ml-4">{editionLabel}</span>
                      </div>
                    )
                  )}

                  {/* Page Content Blocks */}
                  <div
                    className="flex-1 flex flex-col"
                    style={{ gap: `${blockGapPx}px` }}
                  >
                    {page.entries.length === 0 ? (
                      <div
                        onDragOver={(e) => {
                          if (readOnly || printMode || !hasLabPressDrag(e.dataTransfer)) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveDropIndex(lab.blocks.length);
                        }}
                        onDrop={(e) => handleDropAtIndex(e, lab.blocks.length)}
                        className={`py-12 text-center border border-dashed rounded-md text-xs transition-colors ${
                          activeDropIndex === lab.blocks.length
                            ? 'border-blue-500 bg-blue-50/60 text-blue-700 font-medium'
                            : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        {activeDropIndex === lab.blocks.length
                          ? 'Drop here to place on this page'
                          : isFirstPage
                            ? 'Drag a block here or click + Add in the toolbar to start writing.'
                            : 'Blank page after page break. Drag a block here or remove the break above.'}
                      </div>
                    ) : (
                      page.entries.map((entry, idxInPage) => {
                        const { block, originalIndex } = entry;
                        return (
                          <div
                            key={block.id}
                            ref={(el) => {
                              if (el) {
                                blockNodesRef.current.set(block.id, el);
                              } else {
                                blockNodesRef.current.delete(block.id);
                              }
                            }}
                          >
                            {!readOnly && onInsertBlockAt && idxInPage === 0 && (
                              <div className="mb-1.5">
                                {renderDropSlot(originalIndex, isFirstPage)}
                              </div>
                            )}
                            <BlockView
                              block={block}
                              index={originalIndex}
                              totalBlocks={lab.blocks.length}
                              isSelected={selectedBlockId === block.id}
                              readOnly={readOnly || printMode}
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
                              <div className="mt-1.5">
                                {renderDropSlot(originalIndex + 1, true)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Bottom "+ Add" drop zone & button on the final page */}
                    {isLastPage && !readOnly && !printMode && onInsertBlockAt && (
                      <div
                        onDragOver={(e) => {
                          if (!hasLabPressDrag(e.dataTransfer)) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveDropIndex(lab.blocks.length);
                        }}
                        onDrop={(e) => handleDropAtIndex(e, lab.blocks.length)}
                      >
                        <AddBlockMenu
                          variant="footer"
                          modules={modules}
                          onInsert={(type, modId) =>
                            onInsertBlockAt(lab.blocks.length, type, modId)
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* True Running Footer on Every Physical Page */}
                  <footer className="mt-6 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 tabular-nums shrink-0">
                    <span className="truncate">{resolvedFooter}</span>
                    <span className="shrink-0 ml-4">
                      {layout.showPageNumbers
                        ? `${editionLabel} · Page ${page.pageNumber} of ${totalPages}`
                        : editionLabel}
                    </span>
                  </footer>
                </article>
              </div>

              {/* Manual Page Break indicator between sheets (screen editor only) */}
              {!printMode && !readOnly && page.trailingBreak && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="-mt-4 mb-4 flex items-center justify-center gap-3 text-[11px] text-slate-500 select-none"
                >
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                    <Scissors className="w-3 h-3 text-blue-700" />
                    Manual Page Break
                  </span>
                  {onDeleteBlock && (
                    <button
                      type="button"
                      onClick={() => onDeleteBlock(page.trailingBreak!.block.id)}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
