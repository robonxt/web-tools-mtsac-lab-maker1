import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudienceMode,
  CodePrintTheme,
  Course,
  DocKind,
  LabBlock,
  LabBlockType,
  LabDocument,
  LabSnapshot,
  LayoutProfile,
  PageSetup,
  ReusableModule,
  SetupSection,
  WorkspaceState,
  WorkspaceView,
} from './types/lab';
import { createEmptyWorkspace, createSeedWorkspace } from './data/seedWorkspace';
import { parseImportedWorkspaceJson, workspaceRepository } from './lib/storage';
import {
  buildTemplateBlocks,
  cloneBlockWithFreshIds,
  createDefaultBlock,
  createId,
  LabTemplateKind,
} from './lib/blockFactory';
import { buildVariableMap, findMissingVariablesInLab } from './lib/variables';
import { resolvePageSetup } from './lib/pageGeometry';
import {
  exportCoursePacketZip,
  exportWorkspaceJson,
  generateMarkdown,
  generateStandaloneHtml,
  slugifyFilename,
  triggerFileDownload,
} from './lib/exporter';
import { WorkspaceBar } from './components/WorkspaceBar';
import { EditorRibbon } from './components/EditorRibbon';
import { EditorStatusBar } from './components/EditorStatusBar';
import { LibraryView } from './components/LibraryView';
import { OutlineRail } from './components/OutlineRail';
import { PaperCanvas } from './components/PaperCanvas';
import { DocumentSettingsModal } from './components/DocumentSettingsModal';
import { CourseSetupView } from './components/CourseSetupView';
import {
  ExportModal,
  NewCourseModal,
  NewLabModal,
  SaveAsModuleModal,
  SemesterRolloverModal,
  SnapshotDiffModal,
} from './components/Modals';
import { PrintView } from './components/PrintView';

const HISTORY_COALESCE_MS = 650;

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() =>
    workspaceRepository.load(createEmptyWorkspace)
  );
  const [history, setHistory] = useState<WorkspaceState[]>([]);
  const [future, setFuture] = useState<WorkspaceState[]>([]);

  const [activeView, setActiveView] = useState<WorkspaceView>('library');
  const [setupSection, setSetupSection] = useState<SetupSection>('layouts');
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('student');
  const [printEdition, setPrintEdition] = useState<AudienceMode>('student');
  const [printCodeTheme, setPrintCodeTheme] = useState<CodePrintTheme>('light');
  const [showRawTokens, setShowRawTokens] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pageCount, setPageCount] = useState(1);

  // Calm Google Docs defaults: drawers start closed so the paper sheets own the canvas
  const [showOutline, setShowOutline] = useState(false);
  const [showDocumentSettings, setShowDocumentSettings] = useState(false);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [focusedModuleId, setFocusedModuleId] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState('Saved');

  // Modals
  const [showExportModal, setShowExportModal] = useState(false);
  const [newLabCourseId, setNewLabCourseId] = useState<string | null>(null);
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [saveModuleBlock, setSaveModuleBlock] = useState<LabBlock | null>(null);
  const [rolloverCourseId, setRolloverCourseId] = useState<string | null>(null);
  const [activeDiff, setActiveDiff] = useState<{ labId: string; snapshot: LabSnapshot } | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const lastHistoryGroupRef = useRef<{ key: string; ts: number } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2600);
  }, []);

  // Debounced auto-save to WorkspaceRepository
  useEffect(() => {
    setSavedLabel('Saving...');
    const timer = window.setTimeout(() => {
      workspaceRepository.save(workspace);
      setSavedLabel('Saved');
    }, 220);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  const workspaceRef = useRef<WorkspaceState>(workspace);
  workspaceRef.current = workspace;

  const commitWorkspace = useCallback(
    (updater: (prev: WorkspaceState) => WorkspaceState, recordHistory = true) => {
      const current = workspaceRef.current;
      const next = updater(current);
      if (recordHistory) {
        lastHistoryGroupRef.current = null;
        setHistory((h) => [...h.slice(-24), current]);
        setFuture([]);
      }
      setWorkspace(next);
    },
    []
  );

  // Coalesces rapid typing inside the same block/header into one clean undo step
  const commitGroupedWorkspace = useCallback(
    (groupKey: string, updater: (prev: WorkspaceState) => WorkspaceState) => {
      const now = Date.now();
      const prevGroup = lastHistoryGroupRef.current;
      const shouldRecord =
        !prevGroup ||
        prevGroup.key !== groupKey ||
        now - prevGroup.ts > HISTORY_COALESCE_MS;

      const current = workspaceRef.current;
      const next = updater(current);
      if (shouldRecord) {
        setHistory((h) => [...h.slice(-24), current]);
        setFuture([]);
      }
      lastHistoryGroupRef.current = { key: groupKey, ts: now };
      setWorkspace(next);
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    lastHistoryGroupRef.current = null;
    const previous = history[history.length - 1];
    const current = workspaceRef.current;
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [current, ...f.slice(0, 24)]);
    setWorkspace(previous);
    showToast('Undid last change');
  }, [history, showToast]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    lastHistoryGroupRef.current = null;
    const next = future[0];
    const current = workspaceRef.current;
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h.slice(-24), current]);
    setWorkspace(next);
    showToast('Redid change');
  }, [future, showToast]);

  const activeLab = useMemo(
    () => workspace.labs.find((l) => l.id === workspace.activeLabId) || workspace.labs[0],
    [workspace.labs, workspace.activeLabId]
  );

  const activeCourse = useMemo(
    () => workspace.courses.find((c) => c.id === activeLab?.courseId),
    [workspace.courses, activeLab]
  );

  const activeCourseLabs = useMemo(
    () =>
      activeCourse
        ? workspace.labs.filter((l) => l.courseId === activeCourse.id)
        : activeLab
          ? [activeLab]
          : [],
    [workspace.labs, activeCourse, activeLab]
  );

  // Course-inherited layout consistency: use override only if explicitly enabled
  const activeLayout = useMemo(() => {
    const targetId =
      activeLab?.layoutOverrideId ||
      activeCourse?.defaultLayoutId ||
      activeLab?.layoutProfileId;
    return (
      workspace.layoutProfiles.find((p) => p.id === targetId) ||
      workspace.layoutProfiles[0]
    );
  }, [workspace.layoutProfiles, activeCourse, activeLab]);

  const activePageSetup = useMemo(
    () => resolvePageSetup(activeLayout, activeLab),
    [activeLayout, activeLab]
  );

  const resolvedVariables = useMemo(
    () => buildVariableMap(workspace.globalVariables, activeCourse, activeLab),
    [workspace.globalVariables, activeCourse, activeLab]
  );

  const missingVariables = useMemo(() => {
    if (!activeLab) return [];
    return findMissingVariablesInLab(
      activeLab,
      resolvedVariables,
      workspace.modules,
      activeLayout?.footerTemplate
    );
  }, [activeLab, resolvedVariables, workspace.modules, activeLayout?.footerTemplate]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Alt+ArrowUp / Alt+ArrowDown steps selection across blocks in the editor
      if (
        e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        activeView === 'editor' &&
        activeLab &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown')
      ) {
        const visibleBlocks = activeLab.blocks.filter(
          (b) => audienceMode === 'instructor' || b.audience !== 'instructor'
        );
        if (visibleBlocks.length === 0) return;
        e.preventDefault();
        const idx = selectedBlockId
          ? visibleBlocks.findIndex((b) => b.id === selectedBlockId)
          : -1;
        const nextIdx =
          e.key === 'ArrowDown'
            ? idx < 0
              ? 0
              : Math.min(visibleBlocks.length - 1, idx + 1)
            : idx < 0
              ? visibleBlocks.length - 1
              : Math.max(0, idx - 1);
        const targetId = visibleBlocks[nextIdx].id;
        setSelectedBlockId(targetId);
        document
          .getElementById(`block-${targetId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === 's') {
        e.preventDefault();
        workspaceRepository.save(workspace);
        setSavedLabel('Saved');
        showToast('Saved to browser storage');
        return;
      }

      // Let native browser text undo/redo work when typing inside an input or textarea
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      if (key === 'z' && !e.shiftKey) {
        if (history.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        if (future.length > 0) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    workspace,
    history.length,
    future.length,
    handleUndo,
    handleRedo,
    showToast,
    activeView,
    activeLab,
    audienceMode,
    selectedBlockId,
  ]);

  const openSetupSection = useCallback((section: SetupSection, modId?: string | null) => {
    if (modId !== undefined) setFocusedModuleId(modId);
    setSetupSection(section);
    setActiveView('setup');
  }, []);

  const toggleOutline = useCallback(() => {
    setShowOutline((prev) => !prev);
  }, []);

  /* ----------------------------- Lab Operations ----------------------------- */

  const updateLabById = useCallback(
    (labId: string, updater: (lab: LabDocument) => LabDocument, recordHistory = true) => {
      commitWorkspace(
        (prev) => ({
          ...prev,
          labs: prev.labs.map((l) =>
            l.id === labId
              ? { ...updater(l), updatedAt: new Date().toISOString() }
              : l
          ),
        }),
        recordHistory
      );
    },
    [commitWorkspace]
  );

  const updateActiveLab = useCallback(
    (updater: (lab: LabDocument) => LabDocument, recordHistory = true) => {
      if (!activeLab) return;
      updateLabById(activeLab.id, updater, recordHistory);
    },
    [activeLab, updateLabById]
  );

  const handleChangePageSetupForDoc = useCallback(
    (next: PageSetup | null) => {
      updateActiveLab((lab) => ({ ...lab, pageSetupOverride: next }));
    },
    [updateActiveLab]
  );

  const handleSavePageSetupToLayout = useCallback(
    (next: PageSetup) => {
      if (!activeLayout) return;
      commitWorkspace((prev) => ({
        ...prev,
        layoutProfiles: prev.layoutProfiles.map((p) =>
          p.id === activeLayout.id ? { ...p, pageSetup: next } : p
        ),
        labs: prev.labs.map((l) =>
          l.id === activeLab?.id ? { ...l, pageSetupOverride: null } : l
        ),
      }));
      showToast(`Saved page setup to "${activeLayout.name}"`);
    },
    [activeLayout, activeLab?.id, commitWorkspace, showToast]
  );

  const handleResetPageSetupOverride = useCallback(() => {
    updateActiveLab((lab) => ({ ...lab, pageSetupOverride: null }));
    showToast('Reset page setup to course layout default');
  }, [updateActiveLab, showToast]);

  const handleInsertBlockAt = useCallback(
    (index: number, type: LabBlockType, moduleId?: string) => {
      if (!activeLab) return;
      const newBlock = createDefaultBlock(type, moduleId);
      updateActiveLab((lab) => {
        const blocks = [...lab.blocks];
        const safeIdx = Math.max(0, Math.min(index, blocks.length));
        blocks.splice(safeIdx, 0, newBlock);
        return { ...lab, blocks };
      });
      setSelectedBlockId(newBlock.id);
      window.setTimeout(() => {
        document
          .getElementById(`block-${newBlock.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    },
    [activeLab, updateActiveLab]
  );

  const handleConvertBlockType = useCallback(
    (blockId: string, nextType: LabBlockType) => {
      if (!activeLab) return;
      const replacement = createDefaultBlock(nextType);
      updateActiveLab((lab) => {
        const idx = lab.blocks.findIndex((b) => b.id === blockId);
        if (idx < 0) return lab;
        const original = lab.blocks[idx];
        const nextBlock: LabBlock = {
          ...replacement,
          audience: original.audience,
        };
        const blocks = [...lab.blocks];
        blocks[idx] = nextBlock;
        return { ...lab, blocks };
      });
      setSelectedBlockId(replacement.id);
    },
    [activeLab, updateActiveLab]
  );

  const handleSmartInsert = useCallback(
    (type: LabBlockType, moduleId?: string) => {
      if (!activeLab) return;
      const selectedIdx = selectedBlockId
        ? activeLab.blocks.findIndex((b) => b.id === selectedBlockId)
        : -1;
      const targetIdx = selectedIdx >= 0 ? selectedIdx + 1 : activeLab.blocks.length;
      handleInsertBlockAt(targetIdx, type, moduleId);
    },
    [activeLab, selectedBlockId, handleInsertBlockAt]
  );

  const handleReorderBlock = useCallback(
    (blockId: string, targetIndex: number) => {
      updateActiveLab((lab) => {
        const fromIdx = lab.blocks.findIndex((b) => b.id === blockId);
        if (fromIdx < 0) return lab;
        const blocks = [...lab.blocks];
        const [moved] = blocks.splice(fromIdx, 1);
        const adjustedTarget = fromIdx < targetIndex ? targetIndex - 1 : targetIndex;
        const safeIdx = Math.max(0, Math.min(adjustedTarget, blocks.length));
        if (safeIdx === fromIdx) return lab;
        blocks.splice(safeIdx, 0, moved);
        return { ...lab, blocks };
      });
    },
    [updateActiveLab]
  );

  const handleUpdateBlock = useCallback(
    (blockId: string, updated: LabBlock) => {
      if (!activeLab) return;
      const labId = activeLab.id;
      commitGroupedWorkspace(`block:${labId}:${blockId}`, (prev) => ({
        ...prev,
        labs: prev.labs.map((l) =>
          l.id === labId
            ? {
                ...l,
                updatedAt: new Date().toISOString(),
                blocks: l.blocks.map((b) => (b.id === blockId ? updated : b)),
              }
            : l
        ),
      }));
    },
    [activeLab, commitGroupedWorkspace]
  );

  const handleUpdateLabMeta = useCallback(
    (patch: Partial<Pick<LabDocument, 'labNumber' | 'title' | 'subtitle' | 'estimatedTime'>>) => {
      if (!activeLab) return;
      const labId = activeLab.id;
      commitGroupedWorkspace(`meta:${labId}`, (prev) => ({
        ...prev,
        labs: prev.labs.map((l) =>
          l.id === labId
            ? { ...l, ...patch, updatedAt: new Date().toISOString() }
            : l
        ),
      }));
    },
    [activeLab, commitGroupedWorkspace]
  );

  const handleMoveBlock = useCallback(
    (blockId: string, dir: -1 | 1) => {
      updateActiveLab((lab) => {
        const idx = lab.blocks.findIndex((b) => b.id === blockId);
        const target = idx + dir;
        if (idx < 0 || target < 0 || target >= lab.blocks.length) return lab;
        const blocks = [...lab.blocks];
        [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
        return { ...lab, blocks };
      });
    },
    [updateActiveLab]
  );

  const handleDuplicateBlock = useCallback(
    (blockId: string) => {
      let clonedId: string | null = null;
      updateActiveLab((lab) => {
        const idx = lab.blocks.findIndex((b) => b.id === blockId);
        if (idx < 0) return lab;
        const clone = cloneBlockWithFreshIds(lab.blocks[idx]);
        clonedId = clone.id;
        const blocks = [...lab.blocks];
        blocks.splice(idx + 1, 0, clone);
        return { ...lab, blocks };
      });
      if (clonedId) setSelectedBlockId(clonedId);
    },
    [updateActiveLab]
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      let nextSelected: string | null = null;
      updateActiveLab((lab) => {
        const idx = lab.blocks.findIndex((b) => b.id === blockId);
        const remaining = lab.blocks.filter((b) => b.id !== blockId);
        if (selectedBlockId === blockId && remaining.length > 0) {
          nextSelected = remaining[Math.max(0, idx - 1)]?.id || null;
        }
        return {
          ...lab,
          blocks: remaining,
        };
      });
      if (selectedBlockId === blockId) setSelectedBlockId(nextSelected);
    },
    [updateActiveLab, selectedBlockId]
  );

  const handleDetachModule = useCallback(
    (blockId: string, moduleId: string) => {
      const mod = workspace.modules.find((m) => m.id === moduleId);
      if (!mod) return;
      const clonedBlocks = mod.blocks.map(cloneBlockWithFreshIds);
      updateActiveLab((lab) => {
        const idx = lab.blocks.findIndex((b) => b.id === blockId);
        if (idx < 0) return lab;
        const next = [...lab.blocks];
        next.splice(idx, 1, ...clonedBlocks);
        return { ...lab, blocks: next };
      });
      showToast(`Detached "${mod.title}" into local editable sections`);
    },
    [workspace.modules, updateActiveLab, showToast]
  );

  const handleConfirmSaveAsModule = (params: {
    title: string;
    category: string;
    description: string;
    replaceWithLink: boolean;
  }) => {
    if (!saveModuleBlock || !activeLab) return;
    const modId = createId('mod');
    const newModule: ReusableModule = {
      id: modId,
      title: params.title,
      category: params.category,
      description: params.description,
      updatedAt: new Date().toISOString(),
      blocks: [cloneBlockWithFreshIds(saveModuleBlock)],
    };

    const refBlockId = createId('blk');
    const targetBlockId = saveModuleBlock.id;
    const targetLabId = activeLab.id;

    commitWorkspace((prev) => ({
      ...prev,
      modules: [newModule, ...prev.modules],
      labs: params.replaceWithLink
        ? prev.labs.map((l) =>
            l.id === targetLabId
              ? {
                  ...l,
                  updatedAt: new Date().toISOString(),
                  blocks: l.blocks.map((b) =>
                    b.id === targetBlockId
                      ? {
                          id: refBlockId,
                          type: 'moduleRef' as const,
                          audience: b.audience,
                          moduleId: modId,
                        }
                      : b
                  ),
                }
              : l
          )
        : prev.labs,
    }));

    if (params.replaceWithLink) {
      setSelectedBlockId(refBlockId);
    }
    setSaveModuleBlock(null);
    showToast(
      params.replaceWithLink
        ? `Saved "${newModule.title}" and linked it in place`
        : `Saved "${newModule.title}" to Shared Modules`
    );
  };

  /* -------------------------- Course & Lab Creation ------------------------- */

  const handleCreateLab = (params: {
    courseId: string;
    docKind: DocKind;
    labNumber: string;
    title: string;
    subtitle: string;
    estimatedTime: string;
    template: LabTemplateKind;
  }) => {
    const course = workspace.courses.find((c) => c.id === params.courseId);
    const labId = createId('lab');
    const defaultModuleId =
      params.template === 'programming' ? workspace.modules[0]?.id : undefined;
    const newLab: LabDocument = {
      id: labId,
      courseId: params.courseId,
      docKind: params.docKind,
      labNumber: params.labNumber,
      title: params.title,
      subtitle: params.subtitle,
      estimatedTime: params.estimatedTime,
      layoutProfileId: course?.defaultLayoutId || workspace.layoutProfiles[0].id,
      layoutOverrideId: null,
      blocks: buildTemplateBlocks(params.template, defaultModuleId),
      snapshots: [],
      updatedAt: new Date().toISOString(),
    };

    commitWorkspace((prev) => ({
      ...prev,
      labs: [...prev.labs, newLab],
      activeLabId: labId,
    }));
    setNewLabCourseId(null);
    setSelectedBlockId(null);
    setActiveView('editor');
    showToast(`Created ${newLab.labNumber}: ${newLab.title}`);
  };

  const handleCreateCourse = (params: {
    code: string;
    title: string;
    professor: string;
    semester: string;
    defaultLayoutId: string;
  }) => {
    const courseId = createId('course');
    const newCourse: Course = {
      id: courseId,
      code: params.code,
      title: params.title,
      professor: params.professor,
      semester: params.semester,
      defaultLayoutId: params.defaultLayoutId,
      variables: {},
    };
    commitWorkspace((prev) => ({
      ...prev,
      courses: [...prev.courses, newCourse],
    }));
    setShowNewCourseModal(false);
    setNewLabCourseId(courseId);
    showToast(`Added course ${newCourse.code}`);
  };

  const handleConfirmRollover = (params: {
    code: string;
    nextSemester: string;
    professor: string;
    snapshotBeforeRollover: boolean;
  }) => {
    if (!rolloverCourseId) return;
    const sourceCourse = workspace.courses.find((c) => c.id === rolloverCourseId);
    if (!sourceCourse) return;

    const newCourseId = createId('course');
    const nowIso = new Date().toISOString();
    const clonedCourse: Course = {
      ...sourceCourse,
      id: newCourseId,
      code: params.code,
      semester: params.nextSemester,
      professor: params.professor,
      variables: { ...sourceCourse.variables },
    };

    const sourceLabs = workspace.labs.filter((l) => l.courseId === sourceCourse.id);
    const clonedLabs: LabDocument[] = sourceLabs.map((lab) => ({
      ...JSON.parse(JSON.stringify(lab)),
      id: createId('lab'),
      courseId: newCourseId,
      blocks: lab.blocks.map(cloneBlockWithFreshIds),
      snapshots: [],
      updatedAt: nowIso,
    }));

    commitWorkspace((prev) => {
      const updatedExistingLabs = params.snapshotBeforeRollover
        ? prev.labs.map((lab) => {
            if (lab.courseId !== sourceCourse.id) return lab;
            const archiveSnap: LabSnapshot = {
              id: createId('snap'),
              semester: sourceCourse.semester,
              label: `${sourceCourse.semester} Archive (Before Rollover)`,
              note: `Captured automatically when rolling over to ${params.nextSemester}.`,
              createdAt: nowIso,
              state: JSON.parse(
                JSON.stringify({
                  docKind: lab.docKind,
                  labNumber: lab.labNumber,
                  title: lab.title,
                  subtitle: lab.subtitle,
                  estimatedTime: lab.estimatedTime,
                  layoutProfileId: lab.layoutProfileId,
                  layoutOverrideId: lab.layoutOverrideId ?? null,
                  pageSetupOverride: lab.pageSetupOverride ?? null,
                  blocks: lab.blocks,
                })
              ),
            };
            return { ...lab, snapshots: [archiveSnap, ...lab.snapshots] };
          })
        : prev.labs;

      return {
        ...prev,
        courses: [...prev.courses, clonedCourse],
        labs: [...updatedExistingLabs, ...clonedLabs],
        activeLabId: clonedLabs[0]?.id || prev.activeLabId,
      };
    });

    setRolloverCourseId(null);
    setSelectedBlockId(null);
    setActiveView('editor');
    showToast(
      `Rolled over ${clonedCourse.code} to ${clonedCourse.semester} (${clonedLabs.length} ${
        clonedLabs.length === 1 ? 'doc' : 'docs'
      })`
    );
  };

  const handleDuplicateLab = (labId: string) => {
    const src = workspace.labs.find((l) => l.id === labId);
    if (!src) return;
    const copyId = createId('lab');
    const duplicated: LabDocument = {
      ...JSON.parse(JSON.stringify(src)),
      id: copyId,
      title: `${src.title} (Copy)`,
      blocks: src.blocks.map(cloneBlockWithFreshIds),
      snapshots: [],
      updatedAt: new Date().toISOString(),
    };
    commitWorkspace((prev) => ({
      ...prev,
      labs: [...prev.labs, duplicated],
      activeLabId: copyId,
    }));
    showToast(`Duplicated ${src.labNumber}`);
  };

  const handleDeleteLab = (labId: string) => {
    commitWorkspace((prev) => {
      const remaining = prev.labs.filter((l) => l.id !== labId);
      return {
        ...prev,
        labs: remaining,
        activeLabId:
          prev.activeLabId === labId ? remaining[0]?.id || '' : prev.activeLabId,
      };
    });
    if (activeLab?.id === labId && workspace.labs.length <= 1) {
      setSelectedBlockId(null);
      setActiveView('library');
    }
    showToast('Deleted document');
  };

  const handleDeleteCourse = (courseId: string) => {
    const target = workspace.courses.find((c) => c.id === courseId);
    commitWorkspace((prev) => {
      const remainingCourses = prev.courses.filter((c) => c.id !== courseId);
      const remainingLabs = prev.labs.filter((l) => l.courseId !== courseId);
      const activeStillExists = remainingLabs.some((l) => l.id === prev.activeLabId);
      return {
        ...prev,
        courses: remainingCourses,
        labs: remainingLabs,
        activeLabId: activeStillExists ? prev.activeLabId : remainingLabs[0]?.id || '',
      };
    });
    setSelectedBlockId(null);
    showToast(target ? `Deleted course ${target.code}` : 'Deleted course');
  };

  /* --------------------------- Snapshot Operations -------------------------- */

  const handleCreateSnapshotForLab = (
    labId: string,
    semester: string,
    label: string,
    note: string
  ) => {
    const targetLab = workspace.labs.find((l) => l.id === labId);
    if (!targetLab) return;
    const snap: LabSnapshot = {
      id: createId('snap'),
      semester,
      label,
      note,
      createdAt: new Date().toISOString(),
      state: JSON.parse(
        JSON.stringify({
          docKind: targetLab.docKind,
          labNumber: targetLab.labNumber,
          title: targetLab.title,
          subtitle: targetLab.subtitle,
          estimatedTime: targetLab.estimatedTime,
          layoutProfileId: targetLab.layoutProfileId,
          layoutOverrideId: targetLab.layoutOverrideId ?? null,
          pageSetupOverride: targetLab.pageSetupOverride ?? null,
          blocks: targetLab.blocks,
        })
      ),
    };
    updateLabById(labId, (lab) => ({
      ...lab,
      snapshots: [snap, ...lab.snapshots],
    }));
    showToast(`Saved snapshot "${label}"`);
  };

  const handleRestoreSnapshot = (labId: string, snapshot: LabSnapshot) => {
    const targetLab = workspace.labs.find((l) => l.id === labId);
    if (!targetLab) return;
    const targetCourse = workspace.courses.find((c) => c.id === targetLab.courseId);
    const safetyBackup: LabSnapshot = {
      id: createId('snap'),
      semester: targetCourse?.semester || 'Current',
      label: `Auto-Backup before restoring "${snapshot.label}"`,
      note: 'Captured automatically prior to restore.',
      createdAt: new Date().toISOString(),
      state: JSON.parse(
        JSON.stringify({
          docKind: targetLab.docKind,
          labNumber: targetLab.labNumber,
          title: targetLab.title,
          subtitle: targetLab.subtitle,
          estimatedTime: targetLab.estimatedTime,
          layoutProfileId: targetLab.layoutProfileId,
          layoutOverrideId: targetLab.layoutOverrideId ?? null,
          pageSetupOverride: targetLab.pageSetupOverride ?? null,
          blocks: targetLab.blocks,
        })
      ),
    };

    updateLabById(labId, (lab) => ({
      ...lab,
      docKind: snapshot.state.docKind || lab.docKind,
      labNumber: snapshot.state.labNumber,
      title: snapshot.state.title,
      subtitle: snapshot.state.subtitle,
      estimatedTime: snapshot.state.estimatedTime,
      layoutProfileId: snapshot.state.layoutProfileId,
      layoutOverrideId: snapshot.state.layoutOverrideId ?? null,
      pageSetupOverride: snapshot.state.pageSetupOverride ?? null,
      blocks: JSON.parse(JSON.stringify(snapshot.state.blocks)),
      snapshots: [safetyBackup, ...lab.snapshots],
    }));
    setActiveDiff(null);
    setSelectedBlockId(null);
    showToast(`Restored "${snapshot.label}" (auto-backup saved)`);
  };

  const handleDeleteSnapshotForLab = (labId: string, snapshotId: string) => {
    updateLabById(labId, (lab) => ({
      ...lab,
      snapshots: lab.snapshots.filter((s) => s.id !== snapshotId),
    }));
    showToast('Removed snapshot');
  };

  /* --------------------------- Export & Utilities --------------------------- */

  const handleCopyVariableToken = (key: string) => {
    const token = `{{${key}}}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(token).catch(() => {});
    }
    showToast(`Copied ${token} to clipboard`);
  };

  const handlePrintPdf = (edition: AudienceMode, codeTheme?: CodePrintTheme) => {
    setPrintEdition(edition);
    setPrintCodeTheme(codeTheme || activeLayout?.codePrintTheme || 'light');
    setShowExportModal(false);
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleDownloadHtml = (edition: AudienceMode, codeTheme?: CodePrintTheme) => {
    if (!activeLab || !activeLayout) return;
    const html = generateStandaloneHtml({
      lab: activeLab,
      course: activeCourse,
      layout: activeLayout,
      pageSetup: activePageSetup,
      codePrintTheme: codeTheme || activeLayout.codePrintTheme || 'light',
      globalVariables: workspace.globalVariables,
      modules: workspace.modules,
      audience: edition,
    });
    const filename = `${slugifyFilename([
      activeCourse?.code || 'lab',
      activeLab.labNumber,
      activeLab.title,
      edition,
    ])}.html`;
    triggerFileDownload(filename, html, 'text/html;charset=utf-8');
    setShowExportModal(false);
    showToast(`Downloaded ${filename}`);
  };

  const handleDownloadMarkdown = (edition: AudienceMode) => {
    if (!activeLab || !activeLayout) return;
    const md = generateMarkdown({
      lab: activeLab,
      course: activeCourse,
      layout: activeLayout,
      globalVariables: workspace.globalVariables,
      modules: workspace.modules,
      audience: edition,
    });
    const filename = `${slugifyFilename([
      activeCourse?.code || 'lab',
      activeLab.labNumber,
      activeLab.title,
      edition,
    ])}.md`;
    triggerFileDownload(filename, md, 'text/markdown;charset=utf-8');
    setShowExportModal(false);
    showToast(`Downloaded ${filename}`);
  };

  const handleExportCourseZip = async (opts: {
    editions: 'student' | 'instructor' | 'both';
    formats: { html: boolean; markdown: boolean };
    codePrintTheme: CodePrintTheme;
  }) => {
    if (!activeCourse) return;
    const { filename, fileCount } = await exportCoursePacketZip({
      course: activeCourse,
      labs: activeCourseLabs,
      layoutProfiles: workspace.layoutProfiles,
      globalVariables: workspace.globalVariables,
      modules: workspace.modules,
      editions: opts.editions,
      formats: opts.formats,
      codePrintTheme: opts.codePrintTheme,
    });
    setShowExportModal(false);
    showToast(`Exported ${filename} (${fileCount} files)`);
  };

  const handleImportBackupJson = (raw: string) => {
    const imported = parseImportedWorkspaceJson(raw);
    if (!imported) {
      showToast('Invalid LabPress backup file');
      return;
    }
    commitWorkspace(() => imported);
    setShowExportModal(false);
    setSelectedBlockId(null);
    showToast('Imported workspace backup');
  };

  const handleLoadSampleWorkspace = () => {
    commitWorkspace(() => createSeedWorkspace());
    setSelectedBlockId(null);
    showToast('Loaded sample course workspace');
  };

  const diffLab = activeDiff
    ? workspace.labs.find((l) => l.id === activeDiff.labId) || null
    : null;

  const rolloverCourse = rolloverCourseId
    ? workspace.courses.find((c) => c.id === rolloverCourseId) || null
    : null;

  return (
    <>
      <div className="screen-only-app h-screen w-screen overflow-hidden flex flex-col bg-[#F1F5F9]">
        {activeLayout && (
          <WorkspaceBar
            activeView={activeView}
            onChangeView={setActiveView}
            setupSection={setupSection}
            onChangeSetupSection={setSetupSection}
            courseCode={activeCourse?.code}
            labNumber={activeLab?.labNumber || ''}
            labTitle={activeLab?.title || ''}
            savedLabel={savedLabel}
            missingVariables={missingVariables}
            onOpenVariables={() => openSetupSection('variables')}
            showOutline={showOutline}
            onToggleOutline={toggleOutline}
            showDocumentSettings={showDocumentSettings}
            onOpenDocumentSettings={() => setShowDocumentSettings(true)}
            hasActiveLab={Boolean(activeLab)}
            audienceMode={audienceMode}
            onChangeAudience={setAudienceMode}
            onOpenExport={() => setShowExportModal(true)}
          />
        )}

        {/* Workspace Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeView === 'editor' && activeLab && activeLayout && (
            <EditorRibbon
              canUndo={history.length > 0}
              onUndo={handleUndo}
              canRedo={future.length > 0}
              onRedo={handleRedo}
              selectedBlock={
                activeLab.blocks.find((b) => b.id === selectedBlockId) || null
              }
              selectedIndex={activeLab.blocks.findIndex((b) => b.id === selectedBlockId)}
              totalBlocks={activeLab.blocks.length}
              modules={workspace.modules}
              onInsertBlock={handleSmartInsert}
              onUpdateBlock={handleUpdateBlock}
              onMoveBlock={handleMoveBlock}
              onDuplicateBlock={handleDuplicateBlock}
              onDeleteBlock={handleDeleteBlock}
            />
          )}
          {activeView === 'editor' && activeLab && activeLayout && (
            <div className="flex-1 flex min-h-0 overflow-hidden relative">
              {/* On-Demand Left Document Outline Rail */}
              {showOutline && (
                <OutlineRail
                  lab={activeLab}
                  modules={workspace.modules}
                  selectedBlockId={selectedBlockId}
                  onJumpToBlock={(blockId) => {
                    setSelectedBlockId(blockId);
                    document
                      .getElementById(`block-${blockId}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  onClose={() => setShowOutline(false)}
                />
              )}

              {/* Centered Multi-Page WYSIWYG Paper Canvas */}
              <PaperCanvas
                lab={activeLab}
                course={activeCourse}
                layout={activeLayout}
                pageSetup={activePageSetup}
                codePrintTheme={activeLayout.codePrintTheme || 'light'}
                audienceMode={audienceMode}
                variables={resolvedVariables}
                showRawTokens={showRawTokens}
                modules={workspace.modules}
                selectedBlockId={selectedBlockId}
                zoom={zoom}
                onPageCountChange={setPageCount}
                onSelectBlock={setSelectedBlockId}
                onUpdateLabMeta={handleUpdateLabMeta}
                onUpdateBlock={handleUpdateBlock}
                onMoveBlock={handleMoveBlock}
                onDuplicateBlock={handleDuplicateBlock}
                onDeleteBlock={handleDeleteBlock}
                onInsertBlockAt={handleInsertBlockAt}
                onConvertBlockType={handleConvertBlockType}
                onReorderBlock={handleReorderBlock}
                onSaveBlockAsModule={(blk) => setSaveModuleBlock(blk)}
                onEditMasterModule={(moduleId) => openSetupSection('modules', moduleId)}
                onDetachModule={handleDetachModule}
              />

              {/* Document Settings Modal */}
              {showDocumentSettings && (
                <DocumentSettingsModal
                  lab={activeLab}
                  courses={workspace.courses}
                  layoutProfiles={workspace.layoutProfiles}
                  effectiveLayout={activeLayout}
                  effectivePageSetup={activePageSetup}
                  showRawTokens={showRawTokens}
                  onToggleRawTokens={() => setShowRawTokens((v) => !v)}
                  onUpdateLab={(patch) => updateActiveLab((lab) => ({ ...lab, ...patch }))}
                  onUpdatePageSetup={handleChangePageSetupForDoc}
                  onSavePageSetupToLayout={handleSavePageSetupToLayout}
                  onCreateSnapshot={(sem, lbl, note) =>
                    handleCreateSnapshotForLab(activeLab.id, sem, lbl, note)
                  }
                  onOpenSnapshotDiff={(snap) =>
                    setActiveDiff({ labId: activeLab.id, snapshot: snap })
                  }
                  onOpenCourseSetup={(sec) => openSetupSection(sec)}
                  onClose={() => setShowDocumentSettings(false)}
                />
              )}
            </div>
          )}

          {activeView === 'editor' && activeLab && (
            <EditorStatusBar
              pageCount={pageCount}
              blockCount={activeLab.blocks.length}
              totalPoints={activeLab.blocks.reduce(
                (sum, b) => (b.type === 'response' ? sum + (b.points || 0) : sum),
                0
              )}
              zoom={zoom}
              onChangeZoom={setZoom}
            />
          )}

          {activeView === 'library' && (
            <LibraryView
              courses={workspace.courses}
              labs={workspace.labs}
              activeLabId={activeLab?.id || ''}
              onOpenLab={(id) => {
                commitWorkspace((prev) => ({ ...prev, activeLabId: id }), false);
                setSelectedBlockId(null);
                setActiveView('editor');
              }}
              onOpenNewLab={(cid) =>
                setNewLabCourseId(
                  cid || activeLab?.courseId || workspace.courses[0]?.id || ''
                )
              }
              onOpenNewCourse={() => setShowNewCourseModal(true)}
              onOpenRolloverCourse={(cid) => setRolloverCourseId(cid)}
              onDuplicateLab={handleDuplicateLab}
              onDeleteLab={handleDeleteLab}
              onDeleteCourse={handleDeleteCourse}
              onOpenCourseSetup={() => openSetupSection('layouts')}
              onLoadSampleWorkspace={handleLoadSampleWorkspace}
            />
          )}

          {activeView === 'setup' && activeLab && activeLayout && (
            <CourseSetupView
              section={setupSection}
              onChangeSection={setSetupSection}
              layoutProfiles={workspace.layoutProfiles}
              courses={workspace.courses}
              labs={workspace.labs}
              modules={workspace.modules}
              globalVariables={workspace.globalVariables}
              activeLab={activeLab}
              activeLayout={activeLayout}
              focusedModuleId={focusedModuleId}
              onUpdateLayout={(profile: LayoutProfile) =>
                commitWorkspace(
                  (prev) => ({
                    ...prev,
                    layoutProfiles: prev.layoutProfiles.map((p) =>
                      p.id === profile.id ? profile : p
                    ),
                  }),
                  false
                )
              }
              onCreateLayout={(profile: LayoutProfile) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  layoutProfiles: [...prev.layoutProfiles, profile],
                }));
                showToast(`Created layout "${profile.name}"`);
              }}
              onDeleteLayout={(layoutId) => {
                commitWorkspace((prev) => {
                  const remaining = prev.layoutProfiles.filter((p) => p.id !== layoutId);
                  if (remaining.length === 0) return prev;
                  const fallbackId = remaining[0].id;
                  return {
                    ...prev,
                    layoutProfiles: remaining,
                    courses: prev.courses.map((c) =>
                      c.defaultLayoutId === layoutId ? { ...c, defaultLayoutId: fallbackId } : c
                    ),
                    labs: prev.labs.map((l) => ({
                      ...l,
                      layoutProfileId:
                        l.layoutProfileId === layoutId ? fallbackId : l.layoutProfileId,
                      layoutOverrideId:
                        l.layoutOverrideId === layoutId ? null : l.layoutOverrideId,
                    })),
                  };
                });
                showToast('Deleted layout profile');
              }}
              onAssignLayoutToCourse={(courseId, layoutId) => {
                const course = workspace.courses.find((c) => c.id === courseId);
                const prof = workspace.layoutProfiles.find((p) => p.id === layoutId);
                commitWorkspace((prev) => ({
                  ...prev,
                  courses: prev.courses.map((c) =>
                    c.id === courseId ? { ...c, defaultLayoutId: layoutId } : c
                  ),
                  labs: prev.labs.map((l) =>
                    l.courseId === courseId && !l.layoutOverrideId
                      ? { ...l, layoutProfileId: layoutId }
                      : l
                  ),
                }));
                if (course && prof) {
                  showToast(`Assigned "${prof.name}" as default for ${course.code}`);
                }
              }}
              onUpdateGlobalVariable={(key, value) =>
                commitWorkspace(
                  (prev) => ({
                    ...prev,
                    globalVariables: { ...prev.globalVariables, [key]: value },
                  }),
                  false
                )
              }
              onDeleteGlobalVariable={(key) => {
                commitWorkspace((prev) => {
                  const next = { ...prev.globalVariables };
                  delete next[key];
                  return { ...prev, globalVariables: next };
                });
                showToast(`Removed {{${key}}}`);
              }}
              onUpdateCourseVariable={(courseId, key, value) =>
                commitWorkspace(
                  (prev) => ({
                    ...prev,
                    courses: prev.courses.map((c) =>
                      c.id === courseId
                        ? { ...c, variables: { ...c.variables, [key]: value } }
                        : c
                    ),
                  }),
                  false
                )
              }
              onDeleteCourseVariable={(courseId, key) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  courses: prev.courses.map((c) => {
                    if (c.id !== courseId) return c;
                    const next = { ...c.variables };
                    delete next[key];
                    return { ...c, variables: next };
                  }),
                }));
                showToast(`Removed course override {{${key}}}`);
              }}
              onUpdateCourseMeta={(courseId, patch) =>
                commitWorkspace(
                  (prev) => ({
                    ...prev,
                    courses: prev.courses.map((c) =>
                      c.id === courseId ? { ...c, ...patch } : c
                    ),
                  }),
                  false
                )
              }
              onCopyToken={handleCopyVariableToken}
              onSaveModule={(updated: ReusableModule) =>
                commitWorkspace(
                  (prev) => ({
                    ...prev,
                    modules: prev.modules.map((m) => (m.id === updated.id ? updated : m)),
                  }),
                  false
                )
              }
              onCreateModule={(mod: ReusableModule) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  modules: [mod, ...prev.modules],
                }));
                showToast(`Created reusable module "${mod.title}"`);
              }}
              onDeleteModule={(moduleId) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  modules: prev.modules.filter((m) => m.id !== moduleId),
                }));
                showToast('Deleted reusable module');
              }}
              onOpenLab={(labId) => {
                commitWorkspace((prev) => ({ ...prev, activeLabId: labId }), false);
                setActiveView('editor');
              }}
              onCreateSnapshotForLab={handleCreateSnapshotForLab}
              onOpenSnapshotDiffForLab={(lab, snap) =>
                setActiveDiff({ labId: lab.id, snapshot: snap })
              }
              onDeleteSnapshotForLab={handleDeleteSnapshotForLab}
              onOpenRolloverCourse={(cid) => setRolloverCourseId(cid)}
            />
          )}
        </div>

        {/* Modals */}
        {showExportModal && activeLab && activeLayout && (
          <ExportModal
            lab={activeLab}
            course={activeCourse}
            courseLabs={activeCourseLabs}
            layout={activeLayout}
            pageSetup={activePageSetup}
            defaultAudience={audienceMode}
            defaultCodePrintTheme={activeLayout.codePrintTheme || 'light'}
            missingVariables={missingVariables}
            onJumpToVariables={() => openSetupSection('variables')}
            onClose={() => setShowExportModal(false)}
            onPrintPdf={handlePrintPdf}
            onDownloadHtml={handleDownloadHtml}
            onDownloadMarkdown={handleDownloadMarkdown}
            onExportCourseZip={handleExportCourseZip}
            onExportBackupJson={() => {
              exportWorkspaceJson(workspace);
              showToast('Downloaded LabPress JSON backup');
            }}
            onImportBackupJson={handleImportBackupJson}
          />
        )}

        {saveModuleBlock && (
          <SaveAsModuleModal
            block={saveModuleBlock}
            onClose={() => setSaveModuleBlock(null)}
            onConfirm={handleConfirmSaveAsModule}
          />
        )}

        {rolloverCourse && (
          <SemesterRolloverModal
            course={rolloverCourse}
            labCount={workspace.labs.filter((l) => l.courseId === rolloverCourse.id).length}
            onClose={() => setRolloverCourseId(null)}
            onConfirm={handleConfirmRollover}
          />
        )}

        {activeDiff && diffLab && (
          <SnapshotDiffModal
            snapshot={activeDiff.snapshot}
            currentLab={diffLab}
            modules={workspace.modules}
            onClose={() => setActiveDiff(null)}
            onRestore={(snap) => handleRestoreSnapshot(diffLab.id, snap)}
          />
        )}

        {newLabCourseId !== null && (
          <NewLabModal
            courses={workspace.courses}
            defaultCourseId={newLabCourseId}
            onClose={() => setNewLabCourseId(null)}
            onCreate={handleCreateLab}
          />
        )}

        {showNewCourseModal && (
          <NewCourseModal
            layoutProfiles={workspace.layoutProfiles}
            onClose={() => setShowNewCourseModal(false)}
            onCreate={handleCreateCourse}
          />
        )}

        {/* Quiet Action Toast */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-md shadow-lg"
          >
            {toastMessage}
          </div>
        )}
      </div>

      {/* Dedicated Print-to-PDF Output Layer */}
      <PrintView
        lab={activeLab}
        course={activeCourse}
        layout={activeLayout}
        pageSetup={activePageSetup}
        codePrintTheme={printCodeTheme}
        globalVariables={workspace.globalVariables}
        modules={workspace.modules}
        audienceMode={printEdition}
      />
    </>
  );
}
