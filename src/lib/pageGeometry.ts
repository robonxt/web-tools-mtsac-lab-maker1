import {
  AudienceMode,
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

export interface PaginatedEntry {
  block: LabBlock;
  originalIndex: number;
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
    case 'moduleRef':
      return 150;
    case 'pageBreak':
      return 0;
  }
}

/**
 * Pure WYSIWYG block pagination engine.
 * Packs visible blocks onto exact physical pages using live measured pixel heights,
 * respecting manual Page Break blocks and header/footer heights, while recording
 * exact lab.blocks slice offsets for multi-page drag-and-drop insertion.
 */
export function paginateBlocks(params: {
  blocks: LabBlock[];
  audienceMode: AudienceMode;
  measuredHeights: Record<string, number>;
  headerHeightPx: number;
  geometry: ComputedPageGeometry;
  blockGapPx: number;
}): PaginatedPage[] {
  const {
    blocks,
    audienceMode,
    measuredHeights,
    headerHeightPx,
    geometry,
    blockGapPx,
  } = params;

  const visibleEntries: PaginatedEntry[] = [];
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

  for (const entry of visibleEntries) {
    if (entry.block.type === 'pageBreak') {
      pushCurrentPage(entry);
      continue;
    }

    const blockHeight = measuredHeights[entry.block.id] ?? estimateFallbackHeight(entry.block);
    const neededGap = currentEntries.length > 0 ? blockGapPx : 0;

    // Start a fresh page if this block won't fit on the remaining space
    const canStartNewPage =
      currentEntries.length > 0 || (pages.length === 0 && headerHeightPx > 0);

    if (canStartNewPage && usedHeight + neededGap + blockHeight > currentLimit) {
      pushCurrentPage(undefined, entry.originalIndex);
    }

    const gapOnActivePage = currentEntries.length > 0 ? blockGapPx : 0;
    currentEntries.push(entry);
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
