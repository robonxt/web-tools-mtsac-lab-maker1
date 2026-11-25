import { WorkspaceState } from '../types/lab';

const STORAGE_KEY = 'labpress_workspace_v1';

/**
 * Cloud-ready repository boundary.
 * Currently backed by browser localStorage; a future Firebase/cloud adapter
 * can implement this exact interface without touching UI components.
 */
export interface WorkspaceRepository {
  readonly adapterName: string;
  load(fallback: () => WorkspaceState): WorkspaceState;
  save(state: WorkspaceState): void;
  clear(): void;
}

export class LocalStorageWorkspaceRepository implements WorkspaceRepository {
  readonly adapterName = 'Browser Local Storage';

  load(fallback: () => WorkspaceState): WorkspaceState {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = fallback();
        this.save(seed);
        return seed;
      }
      const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
      if (
        !parsed ||
        !Array.isArray(parsed.courses) ||
        !Array.isArray(parsed.labs) ||
        !Array.isArray(parsed.layoutProfiles) ||
        parsed.layoutProfiles.length === 0
      ) {
        return fallback();
      }
      return parsed as WorkspaceState;
    } catch {
      return fallback();
    }
  }

  save(state: WorkspaceState): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }

  clear(): void {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

export const workspaceRepository: WorkspaceRepository =
  new LocalStorageWorkspaceRepository();

export function parseImportedWorkspaceJson(raw: string): WorkspaceState | null {
  try {
    const data = JSON.parse(raw) as Partial<WorkspaceState>;
    if (
      data &&
      Array.isArray(data.courses) &&
      Array.isArray(data.labs) &&
      Array.isArray(data.layoutProfiles) &&
      Array.isArray(data.modules) &&
      typeof data.globalVariables === 'object'
    ) {
      return {
        schemaVersion: data.schemaVersion || 1,
        globalVariables: data.globalVariables || {},
        layoutProfiles: data.layoutProfiles,
        courses: data.courses,
        modules: data.modules,
        labs: data.labs,
        activeLabId: data.activeLabId || data.labs[0]?.id || '',
      };
    }
    return null;
  } catch {
    return null;
  }
}
