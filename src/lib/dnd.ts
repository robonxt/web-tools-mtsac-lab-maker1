import { LabBlockType } from '../types/lab';

export const LABPRESS_DND_MIME = 'application/x-labpress-block';
const TEXT_PREFIX = '__LABPRESS_DND__:';

export type LabPressDragPayload =
  | {
      kind: 'new-block';
      blockType: LabBlockType;
      moduleId?: string;
    }
  | {
      kind: 'move-block';
      blockId: string;
    };

export function writeDragPayload(
  dataTransfer: DataTransfer,
  payload: LabPressDragPayload
): void {
  const serialized = JSON.stringify(payload);
  dataTransfer.setData(LABPRESS_DND_MIME, serialized);
  dataTransfer.setData('text/plain', `${TEXT_PREFIX}${serialized}`);
  dataTransfer.effectAllowed = payload.kind === 'move-block' ? 'move' : 'copy';
}

export function hasLabPressDrag(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  const types = Array.from(dataTransfer.types || []);
  return types.includes(LABPRESS_DND_MIME) || types.includes('text/plain');
}

export function readDragPayload(
  dataTransfer: DataTransfer | null
): LabPressDragPayload | null {
  if (!dataTransfer) return null;
  try {
    const custom = dataTransfer.getData(LABPRESS_DND_MIME);
    if (custom) {
      return JSON.parse(custom) as LabPressDragPayload;
    }
    const text = dataTransfer.getData('text/plain');
    if (text && text.startsWith(TEXT_PREFIX)) {
      return JSON.parse(text.slice(TEXT_PREFIX.length)) as LabPressDragPayload;
    }
  } catch {
    return null;
  }
  return null;
}
