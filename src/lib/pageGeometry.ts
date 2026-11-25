import {
  AudienceMode,
  BlockSlice,
  LabBlock,
  LabDocument,
  LayoutProfile,
  MarginPreset,
  PageMargins,
  PageSetup,
  PageSizeId,
} from '../types/lab';

export const DPI = 96;

export interface PaperSizeSpec {
  id: PageSizeId;
  label: string;
  shortLabel: string;
  dimensionsLabel: string;
  widthIn: number;
  heightIn: number;
  cssPageSize: string;
}

export const PAPER_SIZES: Record<PageSizeId, PaperSizeSpec> = {
  letter: {
    id: 'letter',
    label: 'US Letter',
    shortLabel: 'Letter',
    dimensionsLabel: '8.5 × 11 in',
    widthIn: 8.5,
    heightIn: 11,
    cssPageSize: 'letter',
  },
  a4: {
    id: 'a4',
    label: 'A4 (ISO)',
    shortLabel: 'A4',
    dimensionsLabel: '210 × 297 mm',
    widthIn: 8.268,
    heightIn: 11.693,
    cssPageSize: 'A4',
  },
  legal: {
    id: 'legal',
    label: 'US Legal',
    shortLabel: 'Legal',
    dimensionsLabel: '8.5 × 14 in',
    widthIn: 8.5,
    heightIn: 14,
    cssPageSize: 'legal',
  },
  a5: {
    id: 'a5',
    label: 'A5 (Half Sheet)',
    shortLabel: 'A5',
    dimensionsLabel: '148 × 210 mm',
    widthIn: 5.827,
    heightIn: 8.268,
    cssPageSize: 'A5',
  },
  tabloid: {
    id: 'tabloid',
    label: 'Tabloid / Ledger',
    shortLabel: 'Tabloid',
    dimensionsLabel: '11 × 17 in',
    widthIn: 11,
    heightIn: 17,
    cssPageSize: '11in 17in',
  },
};

export const MARGIN_PRESETS: Record<
  Exclude<MarginPreset, 'custom'>,
  { label: string; summary: string; margins: PageMargins }
> = {
  narrow: {
    label: 'Narrow',
    summary: '0.5 in all sides',
    margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
  },
  moderate: {
    label: 'Moderate',
    summary: '0.75 in top/bottom · 0.65 in sides',
    margins: { top: 0.75, right: 0.65, bottom: 0.75, left: 0.65 },
  },
  normal: {
    label: 'Normal',
    summary: '1.0 in all sides',
    margins: { top: 1.0, right: 1.0, bottom: 1.0, left: 1.0 },
  },
  wide: {
    label: 'Wide',
    summary: '1.0 in top/bottom · 1.25 in sides',
    margins: { top: 1.0, right: 1.25, bottom: 1.0, left: 1.25 },
  },
};

export const DEFAULT_PAGE_SETUP: PageSetup = {
  size: 'letter',
  orientation: 'portrait',
  marginPreset: 'moderate',
  margins: { ...MARGIN_PRESETS.moderate.margins },
  showRunningHeader: true,
};

export function resolvePageSetup(layout?: LayoutProfile, lab?: LabDocument): PageSetup {
  const raw = lab?.pageSetupOverride || layout?.pageSetup || DEFAULT_PAGE_SETUP;
  const size: PageSizeId = PAPER_SIZES[raw.size] ? raw.size : 'letter';
  const orientation = raw.orientation === 'landscape' ? 'landscape' : 'portrait';
  const margins: PageMargins = {
    top: clampMargin(raw.margins?.top ?? 0.75),
    right: clampMargin(raw.margins?.right ?? 0.65),
    bottom: clampMargin(raw.margins?.bottom ?? 0.75),
    left: clampMargin(raw.margins?.left ?? 0.65),
  };
  return {
    size,
    orientation,
    marginPreset: raw.marginPreset || 'moderate',
    margins,
    showRunningHeader: raw.showRunningHeader ?? true,
  };
}

export function clampMargin(inches: number): number {
  if (!Number.isFinite(inches)) return 0.75;
  return Math.round(Math.min(2.25, Math.max(0.25, inches)) * 100) / 100;
}

export interface ComputedPageGeometry {
  widthPx: number;
  heightPx: number;
  widthIn: number;
  heightIn: number;
  marginTopPx: number;
  marginRightPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  contentWidthPx: number;
  footerHeightPx: number;
  runningHeaderHeightPx: number;
  usableHeightFirstPagePx: number;
  usableHeightLaterPagePx: number;
  cssAtPageSize: string;
}

export function computePageGeometry(setup: PageSetup): ComputedPageGeometry {
  const spec = PAPER_SIZES[setup.size] || PAPER_SIZES.letter;
  const widthIn = setup.orientation === 'landscape' ? spec.heightIn : spec.widthIn;
  const heightIn = setup.orientation === 'landscape' ? spec.widthIn : spec.heightIn;

  const widthPx = Math.round(widthIn * DPI);
  const heightPx = Math.round(heightIn * DPI);
  const marginTopPx = Math.round(setup.margins.top * DPI);
  const marginRightPx = Math.round(setup.margins.right * DPI);
  const marginBottomPx = Math.round(setup.margins.bottom * DPI);
  const marginLeftPx = Math.round(setup.margins.left * DPI);

  const contentWidthPx = Math.max(240, widthPx - marginLeftPx - marginRightPx);
  const footerHeightPx = 36;
  const runningHeaderHeightPx = setup.showRunningHeader ? 30 : 0;

  const usableHeightFirstPagePx = Math.max(
    180,
    heightPx - marginTopPx - marginBottomPx - footerHeightPx
  );
  const usableHeightLaterPagePx = Math.max(
    180,
    heightPx - marginTopPx - marginBottomPx - footerHeightPx - runningHeaderHeightPx
  );

  // Use explicit physical inches for @page size so Chrome/Safari/Firefox print exact orientation
  const cssAtPageSize = `${widthIn.toFixed(3)}in ${heightIn.toFixed(3)}in`;

  return {
    widthPx,
    heightPx,
    widthIn,
    heightIn,
    marginTopPx,
    marginRightPx,
    marginBottomPx,
    marginLeftPx,
    contentWidthPx,
    footerHeightPx,
    runningHeaderHeightPx,
    usableHeightFirstPagePx,
    usableHeightLaterPagePx,
    cssAtPageSize,
  };
}

export function formatPageSetupSummary(setup: PageSetup): string {
  const spec = PAPER_SIZES[setup.size] || PAPER_SIZES.letter;
  const orient = setup.orientation === 'landscape' ? 'Landscape' : 'Portrait';
  return `${spec.shortLabel} · ${orient}`;
}

export interface SubItemHeights {
  header: number;
  items: number[];
}

export interface PaginatedEntry {
  block: LabBlock;
  originalIndex: number;
  /** Unique React render key (distinguishes split slices of the same block) */
  entryKey: string;
  /** Optional slice range when a long Steps or Table block splits cleanly across pages */
  slice?: BlockSlice;
}

export interface PaginatedPage {
  pageNumber: number;
  entries: PaginatedEntry[];
  /** Exact index in lab.blocks where dropping at the start of this page (or onto this empty page) should insert */
  insertStartIndex: number;
  /** Exact index in lab.blocks where dropping at the end of this page (before any trailing pageBreak) should insert */
  insertEndIndex: number;
  /** If a manual pageBreak block immediately ended this page, keep its reference so users can remove it */
  trailingBreak?: PaginatedEntry;
  overflowsSinglePage: boolean;
}

function estimateFallbackHeight(block: LabBlock): number {
  switch (block.type) {
    case 'heading':
      return 42;
    case 'paragraph':
      return Math.max(48, Math.ceil((block.text.length || 60) / 75) * 24 + 12);
    case 'steps':
      return 44 + block.items.length * 88;
    case 'code':
      return 64 + Math.max(2, block.code.split('\n').length) * 20 + (block.expectedOutput ? 70 : 0);
    case 'callout':
      return 84;
    case 'table':
      return 64 + block.rows.length * 36;
    case 'response':
      return 74 + block.answerLines * 28;
    case 'checklist':
      return 54 + block.items.length * 28;
    case 'image':
      return block.src ? 260 : 120;
    case 'math':
      return 76;
    case 'moduleRef':
      return 150;
    case 'pageBreak':
      return 0;
  }
}

function estimateSubItemHeights(block: LabBlock): SubItemHeights | null {
  if (block.type === 'steps' && block.items.length > 1) {
    return {
      header: block.title ? 40 : 8,
      items: block.items.map((item) => {
        const bodyLines = Math.max(1, Math.ceil((item.body.length || 40) / 70));
        return 30 + bodyLines * 22 + (item.checkpoint ? 38 : 0) + 14;
      }),
    };
  }
  if (block.type === 'table' && block.rows.length > 1) {
    return {
      header: (block.caption ? 26 : 0) + 38,
      items: block.rows.map((row) => {
        const longest = row.reduce((max, c) => Math.max(max, c.length), 0);
        return Math.max(34, Math.ceil(longest / 26) * 20 + 14);
      }),
    };
  }
  return null;
}

function getMinimumLeadHeight(
  block: LabBlock,
  measuredHeights: Record<string, number>,
  subItemHeights: Record<string, SubItemHeights>,
  unsplittableBlockId?: string | null
): number {
  if (block.id !== unsplittableBlockId && (block.type === 'steps' || block.type === 'table')) {
    const sub = subItemHeights[block.id] || estimateSubItemHeights(block);
    if (sub && sub.items.length > 0) {
      return sub.header + sub.items[0];
    }
  }
  return measuredHeights[block.id] ?? estimateFallbackHeight(block);
}

/**
 * Pure WYSIWYG block pagination engine.
 * - Packs visible blocks onto exact physical pages using live measured pixel heights.
 * - Prevents orphaned headings by keeping headings attached to their following block.
 * - Splits oversized Steps and Table blocks cleanly across page boundaries (except while actively editing that block).
 * - Preserves exact lab.blocks slice offsets for multi-page drag-and-drop insertion.
 */
export function paginateBlocks(params: {
  blocks: LabBlock[];
  audienceMode: AudienceMode;
  measuredHeights: Record<string, number>;
  subItemHeights?: Record<string, SubItemHeights>;
  headerHeightPx: number;
  geometry: ComputedPageGeometry;
  blockGapPx: number;
  unsplittableBlockId?: string | null;
}): PaginatedPage[] {
  const {
    blocks,
    audienceMode,
    measuredHeights,
    subItemHeights = {},
    headerHeightPx,
    geometry,
    blockGapPx,
    unsplittableBlockId = null,
  } = params;

  const visibleEntries: Array<{ block: LabBlock; originalIndex: number }> = [];
  blocks.forEach((block, originalIndex) => {
    if (audienceMode === 'student' && block.audience === 'instructor') {
      return;
    }
    visibleEntries.push({ block, originalIndex });
  });

  if (visibleEntries.length === 0) {
    return [
      {
        pageNumber: 1,
        entries: [],
        insertStartIndex: blocks.length,
        insertEndIndex: blocks.length,
        overflowsSinglePage: false,
      },
    ];
  }

  const pages: PaginatedPage[] = [];
  let currentEntries: PaginatedEntry[] = [];
  let pageStartIndex = 0;
  let usedHeight = headerHeightPx;
  let currentLimit = geometry.usableHeightFirstPagePx;
  let overflowsSinglePage = false;

  const pushCurrentPage = (trailingBreak?: PaginatedEntry, nextPageStart?: number) => {
    const startIdx =
      currentEntries.length > 0 ? currentEntries[0].originalIndex : pageStartIndex;
    const endIdx = trailingBreak
      ? trailingBreak.originalIndex
      : currentEntries.length > 0
        ? currentEntries[currentEntries.length - 1].originalIndex + 1
        : pageStartIndex;

    pages.push({
      pageNumber: pages.length + 1,
      entries: currentEntries,
      insertStartIndex: startIdx,
      insertEndIndex: endIdx,
      trailingBreak,
      overflowsSinglePage,
    });
    currentEntries = [];
    pageStartIndex = trailingBreak
      ? trailingBreak.originalIndex + 1
      : nextPageStart ?? endIdx;
    usedHeight = 0;
    currentLimit = geometry.usableHeightLaterPagePx;
    overflowsSinglePage = false;
  };

  for (let vi = 0; vi < visibleEntries.length; vi++) {
    const entry = visibleEntries[vi];
    const { block, originalIndex } = entry;

    if (block.type === 'pageBreak') {
      pushCurrentPage({
        block,
        originalIndex,
        entryKey: block.id,
      });
      continue;
    }

    const canStartNewPage =
      currentEntries.length > 0 || (pages.length === 0 && headerHeightPx > 0);
    const neededGap = currentEntries.length > 0 ? blockGapPx : 0;

    // 1. Splittable Steps / Table handling
    const isSplittable =
      block.id !== unsplittableBlockId &&
      ((block.type === 'steps' && block.items.length > 1) ||
        (block.type === 'table' && block.rows.length > 1));

    if (isSplittable) {
      const sub = subItemHeights[block.id] || estimateSubItemHeights(block);
      const totalItems = block.type === 'steps' ? block.items.length : block.rows.length;
      const itemHeights =
        sub && sub.items.length === totalItems
          ? sub.items
          : estimateSubItemHeights(block)!.items;
      const headerH = sub ? sub.header : estimateSubItemHeights(block)!.header;
      const fullH = headerH + itemHeights.reduce((a, b) => a + b, 0);

      // If the entire block fits cleanly on the current page, place it unsliced
      if (usedHeight + neededGap + fullH <= currentLimit) {
        currentEntries.push({
          block,
          originalIndex,
          entryKey: block.id,
        });
        usedHeight += neededGap + fullH;
        continue;
      }

      // Otherwise, slice across pages!
      let cursor = 0;
      while (cursor < totalItems) {
        const gapNow = currentEntries.length > 0 ? blockGapPx : 0;
        const canBreakNow =
          currentEntries.length > 0 || (pages.length === 0 && headerHeightPx > 0);
        const remaining = currentLimit - usedHeight - gapNow;
        const minSliceHeight = headerH + itemHeights[cursor];

        // If not even the header + 1 item fits on the current page, start a fresh page first
        if (canBreakNow && minSliceHeight > remaining) {
          pushCurrentPage(undefined, originalIndex);
          continue;
        }

        const availForItems = currentLimit - usedHeight - (currentEntries.length > 0 ? blockGapPx : 0) - headerH;
        let sliceHeight = 0;
        let end = cursor;
        while (end < totalItems) {
          const h = itemHeights[end];
          if (end > cursor && sliceHeight + h > availForItems) {
            break;
          }
          sliceHeight += h;
          end += 1;
        }

        const isWhole = cursor === 0 && end === totalItems;
        const slice: BlockSlice | undefined = isWhole
          ? undefined
          : {
              kind: block.type === 'steps' ? 'steps' : 'table',
              start: cursor,
              end,
              total: totalItems,
            };

        const activeGap = currentEntries.length > 0 ? blockGapPx : 0;
        currentEntries.push({
          block,
          originalIndex,
          entryKey: slice ? `${block.id}::${slice.start}-${slice.end}` : block.id,
          slice,
        });
        usedHeight += activeGap + headerH + sliceHeight;

        if (usedHeight > currentLimit + 4) {
          overflowsSinglePage = true;
        }

        cursor = end;
        if (cursor < totalItems) {
          pushCurrentPage(undefined, originalIndex);
        }
      }
      continue;
    }

    // 2. Standard indivisible block height
    const blockHeight = measuredHeights[block.id] ?? estimateFallbackHeight(block);

    // 3. Orphan-heading keep-with-next protection
    let keepWithNextExtra = 0;
    if (block.type === 'heading' && vi + 1 < visibleEntries.length) {
      const nextEntry = visibleEntries[vi + 1];
      if (nextEntry.block.type !== 'pageBreak') {
        const nextLeadH = getMinimumLeadHeight(
          nextEntry.block,
          measuredHeights,
          subItemHeights,
          unsplittableBlockId
        );
        // Reserve room for heading + gap + at least the lead portion of the following block (capped so huge blocks don't force an endless break)
        keepWithNextExtra = blockGapPx + Math.min(nextLeadH, 160);
      }
    }

    if (canStartNewPage && usedHeight + neededGap + blockHeight + keepWithNextExtra > currentLimit) {
      pushCurrentPage(undefined, originalIndex);
    }

    const gapOnActivePage = currentEntries.length > 0 ? blockGapPx : 0;
    currentEntries.push({
      block,
      originalIndex,
      entryKey: block.id,
    });
    usedHeight += gapOnActivePage + blockHeight;

    if (usedHeight > currentLimit + 4) {
      overflowsSinglePage = true;
    }
  }

  // Always push the trailing page (even if empty right after a manual page break so user sees the new page)
  if (currentEntries.length > 0 || pages.length === 0 || pages[pages.length - 1].trailingBreak) {
    const startIdx =
      currentEntries.length > 0 ? currentEntries[0].originalIndex : pageStartIndex;
    const endIdx =
      currentEntries.length > 0
        ? currentEntries[currentEntries.length - 1].originalIndex + 1
        : pageStartIndex;
    pages.push({
      pageNumber: pages.length + 1,
      entries: currentEntries,
      insertStartIndex: startIdx,
      insertEndIndex: endIdx,
      overflowsSinglePage,
    });
  }

  return pages;
}
