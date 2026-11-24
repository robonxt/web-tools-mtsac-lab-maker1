import { LabBlockType } from '../types/lab';

export const LABPRESS_DND_MIME = 'application/x-labpress-block';
export const LABPRESS_DND_MOVE_MIME = 'application/x-labpress-move';
export const LABPRESS_DND_NEW_MIME = 'application/x-labpress-new';
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

let activeDragPayload: LabPressDragPayload | null = null;

export function writeDragPayload(
  dataTransfer: DataTransfer,
  payload: LabPressDragPayload
): void {
  activeDragPayload = payload;
  const serialized = JSON.stringify(payload);
  dataTransfer.setData(LABPRESS_DND_MIME, serialized);
  dataTransfer.setData(
    payload.kind === 'move-block' ? LABPRESS_DND_MOVE_MIME : LABPRESS_DND_NEW_MIME,
    payload.kind
  );
  dataTransfer.setData('text/plain', `${TEXT_PREFIX}${serialized}`);
  dataTransfer.effectAllowed = 'all';
}

export function clearActiveDrag(): void {
  activeDragPayload = null;
}

export function getActiveDragPayload(): LabPressDragPayload | null {
  return activeDragPayload;
}

export function getDragKind(
  dataTransfer: DataTransfer | null
): LabPressDragPayload['kind'] | null {
  if (dataTransfer) {
    const types = Array.from(dataTransfer.types || []);
    if (types.includes(LABPRESS_DND_MOVE_MIME)) return 'move-block';
    if (types.includes(LABPRESS_DND_NEW_MIME)) return 'new-block';
  }
  return activeDragPayload?.kind ?? null;
}

export function resolveDropEffect(dataTransfer: DataTransfer | null): 'move' | 'copy' {
  return getDragKind(dataTransfer) === 'move-block' ? 'move' : 'copy';
}

export function hasLabPressDrag(dataTransfer: DataTransfer | null): boolean {
  if (activeDragPayload !== null) return true;
  if (!dataTransfer) return false;
  const types = Array.from(dataTransfer.types || []);
  return (
    types.includes(LABPRESS_DND_MIME) ||
    types.includes(LABPRESS_DND_MOVE_MIME) ||
    types.includes(LABPRESS_DND_NEW_MIME)
  );
}

export function readDragPayload(
  dataTransfer: DataTransfer | null
): LabPressDragPayload | null {
  if (dataTransfer) {
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
      // Fallback to in-memory payload if DataTransfer is unavailable
    }
  }
  return activeDragPayload;
}
