import { BlockDiffItem, LabBlock, LabDocument, LabSnapshot, ReusableModule } from '../types/lab';

export function summarizeBlock(block: LabBlock, modules: ReusableModule[]): { label: string; summary: string } {
  switch (block.type) {
    case 'heading':
      return { label: `Heading (H${block.level})`, summary: block.text || '(Empty heading)' };
    case 'paragraph':
      return { label: 'Paragraph', summary: block.text || '(Empty paragraph)' };
    case 'steps':
      return {
        label: `Procedure Steps (${block.items.length})`,
        summary: `${block.title}: ${block.items.map((s, i) => `${block.startNumber + i}. ${s.title}`).join(' · ')}`,
      };
    case 'code':
      return {
        label: `Code Block (${block.language})`,
        summary: `${block.title}\n${block.code}`,
      };
    case 'callout':
      return {
        label: `Callout (${block.variant})`,
        summary: `${block.title}: ${block.body}`,
      };
    case 'table':
      return {
        label: `Table (${block.rows.length} rows)`,
        summary: `${block.caption || 'Table'} — Columns: ${block.headers.join(', ')}`,
      };
    case 'response':
      return {
        label: `Student Response (${block.points} pts)`,
        summary: `${block.prompt} | Key: ${block.instructorSolution}`,
      };
    case 'checklist':
      return {
        label: `Checklist (${block.items.length} items)`,
        summary: `${block.title}: ${block.items.map((i) => i.text).join('; ')}`,
      };
    case 'image':
      return {
        label: `Image / Figure (${block.width}%)`,
        summary: block.caption || block.alt || '(Untitled figure)',
      };
    case 'math':
      return {
        label: `Math Equation${block.label ? ` ${block.label}` : ''}`,
        summary: block.latex || '(Empty equation)',
      };
    case 'moduleRef': {
      const mod = modules.find((m) => m.id === block.moduleId);
      return {
        label: 'Linked Module',
        summary: mod ? mod.title : `Module (${block.moduleId})`,
      };
    }
    case 'pageBreak':
      return { label: 'Page Break', summary: block.label || 'Page Break' };
  }
}

function canonicalBlockSignature(block: LabBlock): string {
  return JSON.stringify(block);
}

export interface SnapshotDiffResult {
  metadataChanges: Array<{ field: string; before: string; after: string }>;
  blocks: BlockDiffItem[];
  counts: {
    added: number;
    modified: number;
    removed: number;
    unchanged: number;
  };
}

export function diffSnapshotWithCurrent(
  snapshot: LabSnapshot,
  currentLab: LabDocument,
  modules: ReusableModule[]
): SnapshotDiffResult {
  const metadataChanges: Array<{ field: string; before: string; after: string }> = [];

  if (snapshot.state.labNumber !== currentLab.labNumber) {
    metadataChanges.push({
      field: 'Lab Number',
      before: snapshot.state.labNumber,
      after: currentLab.labNumber,
    });
  }
  if (snapshot.state.title !== currentLab.title) {
    metadataChanges.push({
      field: 'Title',
      before: snapshot.state.title,
      after: currentLab.title,
    });
  }
  if (snapshot.state.subtitle !== currentLab.subtitle) {
    metadataChanges.push({
      field: 'Subtitle',
      before: snapshot.state.subtitle,
      after: currentLab.subtitle,
    });
  }
  if (snapshot.state.estimatedTime !== currentLab.estimatedTime) {
    metadataChanges.push({
      field: 'Estimated Time',
      before: snapshot.state.estimatedTime,
      after: currentLab.estimatedTime,
    });
  }

  const beforeMap = new Map(snapshot.state.blocks.map((b) => [b.id, b]));
  const afterMap = new Map(currentLab.blocks.map((b) => [b.id, b]));

  const diffs: BlockDiffItem[] = [];
  const seen = new Set<string>();

  // Walk current lab order first (captures added, modified, unchanged)
  for (const curr of currentLab.blocks) {
    seen.add(curr.id);
    const prev = beforeMap.get(curr.id);
    const currInfo = summarizeBlock(curr, modules);
    if (!prev) {
      diffs.push({
        blockId: curr.id,
        status: 'added',
        blockType: curr.type,
        label: currInfo.label,
        afterSummary: currInfo.summary,
      });
    } else if (canonicalBlockSignature(prev) !== canonicalBlockSignature(curr)) {
      const prevInfo = summarizeBlock(prev, modules);
      diffs.push({
        blockId: curr.id,
        status: 'modified',
        blockType: curr.type,
        label: currInfo.label,
        beforeSummary: prevInfo.summary,
        afterSummary: currInfo.summary,
      });
    } else {
      diffs.push({
        blockId: curr.id,
        status: 'unchanged',
        blockType: curr.type,
        label: currInfo.label,
        afterSummary: currInfo.summary,
      });
    }
  }

  // Append any blocks removed since the snapshot
  for (const prev of snapshot.state.blocks) {
    if (!seen.has(prev.id) && !afterMap.has(prev.id)) {
      const prevInfo = summarizeBlock(prev, modules);
      diffs.push({
        blockId: prev.id,
        status: 'removed',
        blockType: prev.type,
        label: prevInfo.label,
        beforeSummary: prevInfo.summary,
      });
    }
  }

  const counts = {
    added: diffs.filter((d) => d.status === 'added').length,
    modified: diffs.filter((d) => d.status === 'modified').length,
    removed: diffs.filter((d) => d.status === 'removed').length,
    unchanged: diffs.filter((d) => d.status === 'unchanged').length,
  };

  return { metadataChanges, blocks: diffs, counts };
}
