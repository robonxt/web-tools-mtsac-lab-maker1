import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Scissors, Trash2 } from 'lucide-react';
import {
  AudienceMode,
  CodePrintTheme,
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
  SubItemHeights,
} from '../lib/pageGeometry';
import {
  clearActiveDrag,
  hasLabPressDrag,
  readDragPayload,
  resolveDropEffect,
} from '../lib/dnd';
import { AutoGrowTextarea } from './AutoGrowTextarea';
import { BlockView } from './BlockView';

type DropIndicator =
  | { kind: 'block'; entryKey: string; edge: 'top' | 'bottom'; targetIndex: number }
  | { kind: 'page-empty'; pageNumber: number; targetIndex: number }
  | { kind: 'page-end'; pageNumber: number; targetIndex: number };

interface PaperCanvasProps {
  lab: LabDocument;
  course?: Course;
  layout: LayoutProfile;
  pageSetup?: PageSetup;
  codePrintTheme?: CodePrintTheme;
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
  onConvertBlockType?: (blockId: string, type: LabBlockType) => void;
  onReorderBlock?: (blockId: string, targetIndex: number) => void;
  onSaveBlockAsModule?: (block: LabBlock) => void;
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
  codePrintTheme,
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
  onConvertBlockType,
  onReorderBlock,
  onSaveBlockAsModule,
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
  const effectiveBlockSpacing =
    layout.blockSpacing || (layout.density === 'compact' ? 'tight' : 'normal');
  const blockGapPx =
    effectiveBlockSpacing === 'tight'
      ? 12
      : effectiveBlockSpacing === 'relaxed'
        ? 32
        : 22;
  const effectiveHeaderSpacing = layout.headerSpacing || 'normal';
  const editionLabel = audienceMode === 'instructor' ? 'Instructor Key' : 'Student Handout';
  const resolvedFooter = resolveVariables(layout.footerTemplate, variables, showRawTokens);

  const totalPoints = useMemo(
    () => lab.blocks.reduce((sum, b) => (b.type === 'response' ? sum + (b.points || 0) : sum), 0),
    [lab.blocks]
  );

  // Live DOM height measurement for true WYSIWYG pagination (whole blocks + splittable sub-items)
  const headerRef = useRef<HTMLDivElement | null>(null);
  const entryNodesRef = useRef<Map<string, { blockId: string; el: HTMLDivElement }>>(new Map());
  const pendingMeasureRef = useRef<boolean>(false);

  const [headerHeightPx, setHeaderHeightPx] = useState<number>(138);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const [subItemHeights, setSubItemHeights] = useState<Record<string, SubItemHeights>>({});
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const isDraggingRef = useRef(false);
  const pendingFocusRef = useRef<{ blockId: string; edge: 'start' | 'end' } | null>(null);

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending || pending.blockId !== selectedBlockId || readOnly || printMode) return;
    pendingFocusRef.current = null;

    const rafId = window.requestAnimationFrame(() => {
      let targetContainer: HTMLDivElement | null = null;
      for (const entry of entryNodesRef.current.values()) {
        if (entry.blockId === pending.blockId) {
          targetContainer = entry.el;
          break;
        }
      }
      if (!targetContainer) return;

      const fields = Array.from(
        targetContainer.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>(
          'textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'
        )
      ).filter((el) => !el.disabled && el.offsetParent !== null);

      if (fields.length === 0) return;
      const field = pending.edge === 'start' ? fields[0] : fields[fields.length - 1];
      field.focus();
      const pos = pending.edge === 'start' ? 0 : field.value.length;
      try {
        field.setSelectionRange(pos, pos);
      } catch {
        // Some input types do not support setSelectionRange
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [selectedBlockId, readOnly, printMode]);

  const setDropIndicatorSafe = useCallback((next: DropIndicator | null) => {
    setDropIndicator((prev) => {
      if (prev === next) return prev;
      if (!prev || !next) return next;
      if (prev.kind !== next.kind || prev.targetIndex !== next.targetIndex) return next;
      if (
        prev.kind === 'block' &&
        next.kind === 'block' &&
        prev.entryKey === next.entryKey &&
        prev.edge === next.edge
      ) {
        return prev;
      }
      if (
        prev.kind !== 'block' &&
        next.kind !== 'block' &&
        prev.pageNumber === next.pageNumber
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const isTypingInsideSelectedBlock = useCallback(() => {
    if (!selectedBlockId || readOnly) return false;
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName;
    if (tag !== 'TEXTAREA' && tag !== 'INPUT') return false;
    for (const entry of entryNodesRef.current.values()) {
      if (entry.blockId === selectedBlockId && entry.el.contains(active)) {
        return true;
      }
    }
    return false;
  }, [selectedBlockId, readOnly]);

  const measureAll = useCallback(
    (force = false) => {
      // Freeze pagination measurements during active drag gestures to prevent ResizeObserver reflow loops
      if (!force && isDraggingRef.current) {
        return;
      }

      const scale = printMode ? 1 : zoom / 100 || 1;
      const nextHeaderH = headerRef.current
        ? Math.ceil(headerRef.current.getBoundingClientRect().height / scale)
        : headerHeightPx;

      const nextHeights: Record<string, number> = {};
      const nextSubCollector = new Map<string, { header: number; items: Map<number, number> }>();

      entryNodesRef.current.forEach(({ blockId, el }, entryKey) => {
        const isSliced = entryKey.includes('::');
        const rectH = el.offsetHeight || Math.ceil(el.getBoundingClientRect().height / scale);
        if (!isSliced && rectH > 0) {
          nextHeights[blockId] = rectH;
        }

        // Collect per-item / per-row heights for Steps and Table blocks so pagination can split cleanly
        const subItems = el.querySelectorAll<HTMLElement>('[data-sub-item-index]');
        if (subItems.length > 0) {
          let bucket = nextSubCollector.get(blockId);
          if (!bucket) {
            bucket = { header: 0, items: new Map<number, number>() };
            nextSubCollector.set(blockId, bucket);
          }

          const headerEls = el.querySelectorAll<HTMLElement>('[data-sub-header="true"]');
          let hdrSum = 0;
          headerEls.forEach((hEl) => {
            const h = hEl.offsetHeight || Math.ceil(hEl.getBoundingClientRect().height / scale);
            hdrSum += h;
          });
          if (hdrSum > 0) {
            // Include spacing between caption/header and first item
            bucket.header = Math.max(bucket.header, hdrSum + 14);
          }

          const stepGap = layout.density === 'compact' ? 10 : 16;
          subItems.forEach((itemEl) => {
            const idxAttr = itemEl.getAttribute('data-sub-item-index');
            if (idxAttr === null) return;
            const idx = parseInt(idxAttr, 10);
            if (!Number.isFinite(idx)) return;
            const itemH =
              itemEl.offsetHeight || Math.ceil(itemEl.getBoundingClientRect().height / scale);
            if (itemH > 0) {
              const extra = itemEl.tagName === 'LI' ? stepGap : 0;
              bucket!.items.set(idx, itemH + extra);
            }
          });
        }
      });

      if (!force && isTypingInsideSelectedBlock()) {
        pendingMeasureRef.current = true;
        return;
      }

      pendingMeasureRef.current = false;
      setHeaderHeightPx((prev) => (Math.abs(prev - nextHeaderH) > 2 ? nextHeaderH : prev));

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

      if (nextSubCollector.size > 0) {
        setSubItemHeights((prev) => {
          let changed = false;
          const merged: Record<string, SubItemHeights> = { ...prev };
          nextSubCollector.forEach((bucket, blockId) => {
            const block = lab.blocks.find((b) => b.id === blockId);
            if (!block || (block.type !== 'steps' && block.type !== 'table')) return;
            const total = block.type === 'steps' ? block.items.length : block.rows.length;
            const prevSub = prev[blockId];
            const itemsArr: number[] = [];
            for (let i = 0; i < total; i++) {
              const measured = bucket.items.get(i);
              if (measured !== undefined) {
                itemsArr.push(measured);
              } else if (prevSub && prevSub.items[i] !== undefined) {
                itemsArr.push(prevSub.items[i]);
              } else {
                itemsArr.push(block.type === 'steps' ? 80 : 36);
              }
            }
            const nextHeader = bucket.header || prevSub?.header || 36;
            const diffHeader = !prevSub || Math.abs(prevSub.header - nextHeader) > 2;
            const diffLen = !prevSub || prevSub.items.length !== itemsArr.length;
            const diffItems =
              diffLen ||
              itemsArr.some((val, i) => Math.abs((prevSub?.items[i] ?? 0) - val) > 2);
            if (diffHeader || diffItems) {
              merged[blockId] = { header: nextHeader, items: itemsArr };
              changed = true;
            }
          });
          return changed ? merged : prev;
        });
      }
    },
    [headerHeightPx, isTypingInsideSelectedBlock, lab.blocks, layout.density, printMode, zoom]
  );

  // Clear drag indicator & unfreeze measurements whenever any drag ends anywhere in the window
  useEffect(() => {
    const clearDrag = () => {
      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;
      setDropIndicator(null);
      clearActiveDrag();
      if (wasDragging) {
        window.requestAnimationFrame(() => measureAll(true));
      }
    };
    window.addEventListener('dragend', clearDrag);
    window.addEventListener('drop', clearDrag);
    return () => {
      window.removeEventListener('dragend', clearDrag);
      window.removeEventListener('drop', clearDrag);
    };
  }, [measureAll]);

  const handleDropAtIndex = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = false;
      setDropIndicator(null);
      const payload = readDragPayload(e.dataTransfer);
      clearActiveDrag();
      if (!payload) return;
      if (payload.kind === 'new-block') {
        onInsertBlockAt?.(targetIndex, payload.blockType, payload.moduleId);
      } else if (payload.kind === 'move-block') {
        onReorderBlock?.(payload.blockId, targetIndex);
      }
    },
    [onInsertBlockAt, onReorderBlock]
  );

  const renderDropLineOverlay = (position: 'top' | 'bottom') => (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 z-30 flex items-center gap-1.5 ${
        position === 'top' ? '-top-2.5' : '-bottom-2.5'
      }`}
    >
      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
      <span className="flex-1 h-[2px] bg-blue-600 rounded-full shadow-[0_0_6px_rgba(37,99,235,0.4)]" />
      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
    </div>
  );

  // Re-measure whenever geometry, layout, audience, blocks, or modules change
  useLayoutEffect(() => {
    measureAll(true);
  }, [
    lab.id,
    lab.labNumber,
    lab.title,
    lab.subtitle,
    lab.blocks,
    layout.fontFamily,
    layout.density,
    layout.headerVariant,
    layout.headerSpacing,
    layout.blockSpacing,
    geometry.contentWidthPx,
    audienceMode,
    showRawTokens,
    modules,
    selectedBlockId,
    measureAll,
  ]);

  // Observe dynamic resizing (e.g. font load, image load, typing multiline, expanding modules)
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      measureAll(false);
    });
    if (headerRef.current) ro.observe(headerRef.current);
    entryNodesRef.current.forEach(({ el }) => ro.observe(el));
    return () => ro.disconnect();
  }, [lab.blocks, audienceMode, geometry.contentWidthPx, selectedBlockId, measureAll]);

  // Flush any deferred height measurements smoothly when user finishes typing in an input/textarea
  const handleBlurCapture = useCallback(() => {
    if (pendingMeasureRef.current) {
      window.requestAnimationFrame(() => measureAll(true));
    }
  }, [measureAll]);

  const pages = useMemo(
    () =>
      paginateBlocks({
        blocks: lab.blocks,
        audienceMode,
        measuredHeights,
        subItemHeights,
        headerHeightPx,
        geometry,
        blockGapPx,
        unsplittableBlockId: readOnly || printMode ? null : selectedBlockId,
      }),
    [
      lab.blocks,
      audienceMode,
      measuredHeights,
      subItemHeights,
      headerHeightPx,
      geometry,
      blockGapPx,
      readOnly,
      printMode,
      selectedBlockId,
    ]
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

    const headerRecalcKey = `${lab.id}-${geometry.contentWidthPx}-${layout.headerVariant}-${effectiveHeaderSpacing}-${layout.fontFamily}-${layout.density}`;

    const titleRowGapClass =
      effectiveHeaderSpacing === 'tight'
        ? 'gap-1.5'
        : effectiveHeaderSpacing === 'relaxed'
          ? 'gap-4'
          : 'gap-2.5';
    const subtitleMarginClass =
      effectiveHeaderSpacing === 'tight'
        ? 'mt-1'
        : effectiveHeaderSpacing === 'relaxed'
          ? 'mt-3'
          : 'mt-2';
    const bannerPaddingClass =
      effectiveHeaderSpacing === 'tight'
        ? 'px-4 py-3 mb-4'
        : effectiveHeaderSpacing === 'relaxed'
          ? 'px-6 py-5 mb-9'
          : 'px-5 py-4 mb-6';
    const rulePaddingClass =
      effectiveHeaderSpacing === 'tight'
        ? 'pb-3 mb-4'
        : effectiveHeaderSpacing === 'relaxed'
          ? 'pb-6 mb-9'
          : 'pb-4 mb-6';
    const gridGapClass =
      effectiveHeaderSpacing === 'tight'
        ? 'gap-3'
        : effectiveHeaderSpacing === 'relaxed'
          ? 'gap-8'
          : 'gap-5';

    const editableTitle = !readOnly && onUpdateLabMeta ? (
      <div className={`flex items-start ${titleRowGapClass}`}>
        <div className="inline-grid items-center shrink-0 max-w-[40%]">
          <span
            aria-hidden="true"
            className="col-start-1 row-start-1 invisible whitespace-pre min-w-[2ch] font-bold text-[23px] leading-tight tracking-tight pr-0.5"
          >
            {lab.labNumber || 'Lab'}
          </span>
          <input
            type="text"
            size={1}
            value={lab.labNumber}
            onChange={(e) => onUpdateLabMeta({ labNumber: e.target.value })}
            aria-label="Document number"
            className="col-start-1 row-start-1 w-full min-w-0 font-bold text-[23px] leading-tight tracking-tight bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none"
            style={{ color: layout.accentColor }}
          />
        </div>
        <AutoGrowTextarea
          value={lab.title}
          onChange={(nextTitle) => onUpdateLabMeta({ title: nextTitle })}
          placeholder="Document title..."
          ariaLabel="Document title"
          singleLineWrap
          recalcKey={headerRecalcKey}
          className="flex-1 min-w-0 font-bold text-[23px] leading-tight tracking-tight text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none"
        />
      </div>
    ) : (
      <h1 className="text-[23px] font-bold tracking-tight text-slate-900 leading-tight break-words">
        <span
          className={
            effectiveHeaderSpacing === 'tight'
              ? 'mr-1'
              : effectiveHeaderSpacing === 'relaxed'
                ? 'mr-2.5'
                : 'mr-1.5'
          }
          style={{ color: layout.accentColor }}
        >
          {lab.labNumber}:
        </span>
        {resolveVariables(lab.title, variables, showRawTokens)}
      </h1>
    );

    const editableSubtitle = !readOnly && onUpdateLabMeta ? (
      <AutoGrowTextarea
        value={lab.subtitle}
        onChange={(nextSubtitle) => onUpdateLabMeta({ subtitle: nextSubtitle })}
        placeholder="Add a brief subtitle or learning focus..."
        ariaLabel="Document subtitle"
        recalcKey={headerRecalcKey}
        className={`w-full ${subtitleMarginClass} text-sm leading-relaxed text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none`}
      />
    ) : lab.subtitle ? (
      <p className={`${subtitleMarginClass} text-sm text-slate-600 leading-relaxed break-words`}>
        {resolveVariables(lab.subtitle, variables, showRawTokens)}
      </p>
    ) : null;

    if (layout.headerVariant === 'banner') {
      return (
        <header
          className={`bg-slate-50 border border-slate-200 ${bannerPaddingClass}`}
          style={{ borderTopWidth: '3px', borderTopColor: layout.accentColor }}
        >
          <div className="text-xs text-slate-500 mb-1.5 tabular-nums break-words">{metaLine}</div>
          {editableTitle}
          {editableSubtitle}
        </header>
      );
    }

    if (layout.headerVariant === 'grid') {
      return (
        <header className={`${rulePaddingClass} border-b border-slate-300`}>
          <div className={`flex items-start justify-between ${gridGapClass}`}>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-500 mb-1 break-words">
                {course?.code} — {course?.title} · {kindLabel}
              </div>
              {editableTitle}
              {editableSubtitle}
            </div>
            <div className="w-48 shrink-0 bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 space-y-0.5 tabular-nums break-words">
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
        className={rulePaddingClass}
        style={{ borderBottomWidth: '2px', borderBottomColor: layout.accentColor }}
      >
        <div className="text-xs text-slate-500 mb-1.5 tabular-nums break-words">{metaLine}</div>
        {editableTitle}
        {editableSubtitle}
      </header>
    );
  };

  const scaleFactor = printMode ? 1 : zoom / 100;
  const totalPages = pages.length;

  const handleCanvasKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (readOnly || printMode || !selectedBlockId || !onSelectBlock) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;

      // Do not hijack arrow keys when slash/variable autocomplete popover is open
      if (document.querySelector('[role="listbox"]')) return;

      const target = e.target;
      if (
        !(target instanceof HTMLTextAreaElement) &&
        !(target instanceof HTMLInputElement && target.type === 'text')
      ) {
        return;
      }

      const selStart = target.selectionStart ?? 0;
      const selEnd = target.selectionEnd ?? 0;
      if (selStart !== selEnd) return;

      const isInput = target instanceof HTMLInputElement;
      const atStart = isInput || selStart === 0;
      const atEnd = isInput || selStart === target.value.length;

      if (e.key === 'ArrowUp' && !atStart) return;
      if (e.key === 'ArrowDown' && !atEnd) return;

      let activeContainer: HTMLDivElement | null = null;
      for (const entry of entryNodesRef.current.values()) {
        if (entry.blockId === selectedBlockId && entry.el.contains(target)) {
          activeContainer = entry.el;
          break;
        }
      }
      if (!activeContainer) return;

      const fields = Array.from(
        activeContainer.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>(
          'textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'
        )
      ).filter((el) => !el.disabled && el.offsetParent !== null);

      const fieldIdx = fields.indexOf(target);
      if (fieldIdx === -1) return;

      // Move between fields inside the same block first (e.g. Steps or Question + Key)
      if (e.key === 'ArrowUp' && fieldIdx > 0) {
        e.preventDefault();
        const prevField = fields[fieldIdx - 1];
        prevField.focus();
        try {
          prevField.setSelectionRange(prevField.value.length, prevField.value.length);
        } catch {
          // Ignore unsupported input types
        }
        return;
      }

      if (e.key === 'ArrowDown' && fieldIdx < fields.length - 1) {
        e.preventDefault();
        const nextField = fields[fieldIdx + 1];
        nextField.focus();
        try {
          nextField.setSelectionRange(0, 0);
        } catch {
          // Ignore unsupported input types
        }
        return;
      }

      // Jump to adjacent visible block in document order
      const visibleBlockIds = lab.blocks
        .filter(
          (b) =>
            b.type !== 'pageBreak' &&
            !(audienceMode === 'student' && b.audience === 'instructor')
        )
        .map((b) => b.id);

      const curBlockIdx = visibleBlockIds.indexOf(selectedBlockId);
      if (curBlockIdx === -1) return;

      const nextBlockId =
        e.key === 'ArrowUp'
          ? visibleBlockIds[curBlockIdx - 1]
          : visibleBlockIds[curBlockIdx + 1];

      if (!nextBlockId) return;

      e.preventDefault();
      pendingFocusRef.current = {
        blockId: nextBlockId,
        edge: e.key === 'ArrowUp' ? 'end' : 'start',
      };
      onSelectBlock(nextBlockId);
    },
    [readOnly, printMode, selectedBlockId, onSelectBlock, lab.blocks, audienceMode]
  );

  return (
    <div
      onClick={() => onSelectBlock?.(null)}
      onKeyDown={handleCanvasKeyDown}
      onBlurCapture={handleBlurCapture}
      onDragOver={(e) => {
        if (!readOnly && !printMode && hasLabPressDrag(e.dataTransfer)) {
          e.preventDefault();
          isDraggingRef.current = true;
          e.dataTransfer.dropEffect = resolveDropEffect(e.dataTransfer);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropIndicator(null);
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
                    className="flex-1 flex flex-col relative"
                    style={{ gap: `${blockGapPx}px` }}
                    onDragOver={(e) => {
                      if (readOnly || printMode || !hasLabPressDrag(e.dataTransfer)) return;
                      e.preventDefault();
                      e.stopPropagation();
                      isDraggingRef.current = true;
                      e.dataTransfer.dropEffect = resolveDropEffect(e.dataTransfer);

                      if (page.entries.length === 0) {
                        setDropIndicatorSafe({
                          kind: 'page-empty',
                          pageNumber: page.pageNumber,
                          targetIndex: page.insertStartIndex,
                        });
                        return;
                      }

                      const cursorY = e.clientY;
                      for (let i = 0; i < page.entries.length; i++) {
                        const entry = page.entries[i];
                        const node = entryNodesRef.current.get(entry.entryKey)?.el;
                        if (!node) continue;
                        const rect = node.getBoundingClientRect();
                        if (cursorY < rect.top + rect.height / 2) {
                          setDropIndicatorSafe({
                            kind: 'block',
                            entryKey: entry.entryKey,
                            edge: 'top',
                            targetIndex: entry.originalIndex,
                          });
                          return;
                        }
                      }

                      setDropIndicatorSafe({
                        kind: 'page-end',
                        pageNumber: page.pageNumber,
                        targetIndex: page.insertEndIndex,
                      });
                    }}
                    onDrop={(e) => {
                      if (readOnly || printMode || !hasLabPressDrag(e.dataTransfer)) return;
                      if (page.entries.length === 0) {
                        handleDropAtIndex(e, page.insertStartIndex);
                        return;
                      }
                      const cursorY = e.clientY;
                      for (let i = 0; i < page.entries.length; i++) {
                        const entry = page.entries[i];
                        const node = entryNodesRef.current.get(entry.entryKey)?.el;
                        if (!node) continue;
                        const rect = node.getBoundingClientRect();
                        if (cursorY < rect.top + rect.height / 2) {
                          handleDropAtIndex(e, entry.originalIndex);
                          return;
                        }
                      }
                      handleDropAtIndex(e, page.insertEndIndex);
                    }}
                  >
                    {page.entries.length === 0 ? (
                      <div
                        className={`py-12 text-center border border-dashed rounded-md text-xs transition-colors ${
                          dropIndicator?.kind === 'page-empty' &&
                          dropIndicator.pageNumber === page.pageNumber
                            ? 'border-blue-500 bg-blue-50/60 text-blue-700 font-medium'
                            : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        {dropIndicator?.kind === 'page-empty' &&
                        dropIndicator.pageNumber === page.pageNumber
                          ? 'Drop here to place on this page'
                          : isFirstPage
                            ? 'Use the Insert ribbon above to add a section, or type / in a text block.'
                            : 'Blank page after page break. Drag a block here or remove the break above.'}
                      </div>
                    ) : (
                      page.entries.map((entry, idxInPage) => {
                        const { block, originalIndex, entryKey, slice } = entry;
                        const showTopLine =
                          dropIndicator?.kind === 'block' &&
                          dropIndicator.entryKey === entryKey &&
                          dropIndicator.edge === 'top';
                        const isLastBlockOnPage = idxInPage === page.entries.length - 1;
                        const showBottomLine =
                          (dropIndicator?.kind === 'block' &&
                            dropIndicator.entryKey === entryKey &&
                            dropIndicator.edge === 'bottom') ||
                          (isLastBlockOnPage &&
                            dropIndicator?.kind === 'page-end' &&
                            dropIndicator.pageNumber === page.pageNumber);
                        const isLastSliceOfBlock = !slice || slice.end >= slice.total;

                        return (
                          <div
                            key={entryKey}
                            ref={(el) => {
                              if (el) {
                                entryNodesRef.current.set(entryKey, { blockId: block.id, el });
                              } else {
                                entryNodesRef.current.delete(entryKey);
                              }
                            }}
                            onDragOver={(e) => {
                              if (readOnly || printMode || !hasLabPressDrag(e.dataTransfer)) return;
                              e.preventDefault();
                              e.stopPropagation();
                              isDraggingRef.current = true;
                              e.dataTransfer.dropEffect = resolveDropEffect(e.dataTransfer);
                              const rect = e.currentTarget.getBoundingClientRect();
                              const isTopHalf = e.clientY < rect.top + rect.height / 2;
                              setDropIndicatorSafe({
                                kind: 'block',
                                entryKey,
                                edge: isTopHalf ? 'top' : 'bottom',
                                targetIndex: isTopHalf ? originalIndex : originalIndex + 1,
                              });
                            }}
                            onDrop={(e) => {
                              if (readOnly || printMode || !hasLabPressDrag(e.dataTransfer)) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              const isTopHalf = e.clientY < rect.top + rect.height / 2;
                              handleDropAtIndex(e, isTopHalf ? originalIndex : originalIndex + 1);
                            }}
                            className="relative"
                          >
                            {showTopLine && renderDropLineOverlay('top')}

                            <BlockView
                              block={block}
                              index={originalIndex}
                              totalBlocks={lab.blocks.length}
                              isSelected={selectedBlockId === block.id}
                              readOnly={readOnly || printMode}
                              printMode={printMode}
                              codePrintTheme={codePrintTheme}
                              slice={slice}
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
                              onConvertBlockType={(nextType) =>
                                onConvertBlockType?.(block.id, nextType)
                              }
                              onInsertParagraphBelow={() =>
                                onInsertBlockAt?.(originalIndex + 1, 'paragraph')
                              }
                              onSaveAsModule={
                                onSaveBlockAsModule
                                  ? () => onSaveBlockAsModule(block)
                                  : undefined
                              }
                              onEditMasterModule={onEditMasterModule}
                              onDetachModule={onDetachModule}
                            />

                            {showBottomLine && renderDropLineOverlay('bottom')}
                          </div>
                        );
                      })
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
