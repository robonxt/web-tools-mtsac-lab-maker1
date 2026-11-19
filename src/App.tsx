import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudienceMode,
  Course,
  DocKind,
  LabBlock,
  LabBlockType,
  LabDocument,
  LabSnapshot,
  LayoutProfile,
  ReusableModule,
  SetupSection,
  WorkspaceState,
  WorkspaceView,
} from './types/lab';
import { createSeedWorkspace } from './data/seedWorkspace';
import { parseImportedWorkspaceJson, workspaceRepository } from './lib/storage';
import {
  buildTemplateBlocks,
  cloneBlockWithFreshIds,
  createDefaultBlock,
  createId,
  LabTemplateKind,
} from './lib/blockFactory';
import { buildVariableMap } from './lib/variables';
import {
  exportWorkspaceJson,
  generateStandaloneHtml,
  slugifyFilename,
  triggerFileDownload,
} from './lib/exporter';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { EditorToolbar } from './components/EditorToolbar';
import { PaperCanvas } from './components/PaperCanvas';
import { DetailsDrawer } from './components/DetailsDrawer';
import { CourseSetupView } from './components/CourseSetupView';
import {
  ExportModal,
  NewCourseModal,
  NewLabModal,
  SnapshotDiffModal,
} from './components/Modals';
import { PrintView } from './components/PrintView';

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() =>
    workspaceRepository.load(createSeedWorkspace)
  );
  const [history, setHistory] = useState<WorkspaceState[]>([]);

  const [activeView, setActiveView] = useState<WorkspaceView>('editor');
  const [setupSection, setSetupSection] = useState<SetupSection>('layouts');
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('student');
  const [printEdition, setPrintEdition] = useState<AudienceMode>('student');
  const [showRawTokens, setShowRawTokens] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Calm Google Docs defaults: drawers start closed so the paper sheet owns the canvas
  const [showDocumentsDrawer, setShowDocumentsDrawer] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [focusedModuleId, setFocusedModuleId] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState('Saved');

  // Modals
  const [showExportModal, setShowExportModal] = useState(false);
  const [newLabCourseId, setNewLabCourseId] = useState<string | null>(null);
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [activeDiff, setActiveDiff] = useState<{ labId: string; snapshot: LabSnapshot } | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);

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

  const commitWorkspace = useCallback(
    (updater: (prev: WorkspaceState) => WorkspaceState, recordHistory = true) => {
      setWorkspace((prev) => {
        if (recordHistory) {
          setHistory((h) => [...h.slice(-24), prev]);
        }
        return updater(prev);
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setWorkspace(last);
      showToast('Undid last change');
      return prev.slice(0, -1);
    });
  }, [showToast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        workspaceRepository.save(workspace);
        setSavedLabel('Saved');
        showToast('Saved to browser storage');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [workspace, showToast]);

  const activeLab = useMemo(
    () => workspace.labs.find((l) => l.id === workspace.activeLabId) || workspace.labs[0],
    [workspace.labs, workspace.activeLabId]
  );

  const activeCourse = useMemo(
    () => workspace.courses.find((c) => c.id === activeLab?.courseId),
    [workspace.courses, activeLab]
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

  const resolvedVariables = useMemo(
    () => buildVariableMap(workspace.globalVariables, activeCourse, activeLab),
    [workspace.globalVariables, activeCourse, activeLab]
  );

  const instructorHiddenCount = useMemo(
    () =>
      activeLab
        ? activeLab.blocks.filter((b) => b.audience === 'instructor').length
        : 0,
    [activeLab]
  );

  const openSetupSection = useCallback((section: SetupSection, modId?: string | null) => {
    if (modId !== undefined) setFocusedModuleId(modId);
    setSetupSection(section);
    setActiveView('setup');
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

  const handleUpdateBlock = useCallback(
    (blockId: string, updated: LabBlock) => {
      updateActiveLab(
        (lab) => ({
          ...lab,
          blocks: lab.blocks.map((b) => (b.id === blockId ? updated : b)),
        }),
        false
      );
    },
    [updateActiveLab]
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
      updateActiveLab((lab) => ({
        ...lab,
        blocks: lab.blocks.filter((b) => b.id !== blockId),
      }));
      if (selectedBlockId === blockId) setSelectedBlockId(null);
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
    setShowDocumentsDrawer(false);
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
      variables: {
        runtime_version: 'Standard Lab Environment',
      },
    };
    commitWorkspace((prev) => ({
      ...prev,
      courses: [...prev.courses, newCourse],
    }));
    setShowNewCourseModal(false);
    setNewLabCourseId(courseId);
    showToast(`Added course ${newCourse.code}`);
  };

  const handleDuplicateLab = (labId: string) => {
    const src = workspace.labs.find((l) => l.id === labId);
    if (!src) return;
    const copyId = createId('lab');
    const duplicated: LabDocument = {
      ...JSON.parse(JSON.stringify(src)),
      id: copyId,
      title: `${src.title} (Copy)`,
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
    if (workspace.labs.length <= 1) return;
    commitWorkspace((prev) => {
      const remaining = prev.labs.filter((l) => l.id !== labId);
      return {
        ...prev,
        labs: remaining,
        activeLabId: prev.activeLabId === labId ? remaining[0].id : prev.activeLabId,
      };
    });
    showToast('Deleted document');
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

  const handlePrintPdf = (edition: AudienceMode) => {
    setPrintEdition(edition);
    setShowExportModal(false);
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleDownloadHtml = (edition: AudienceMode) => {
    if (!activeLab || !activeLayout) return;
    const html = generateStandaloneHtml({
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
    ])}.html`;
    triggerFileDownload(filename, html, 'text/html;charset=utf-8');
    setShowExportModal(false);
    showToast(`Downloaded ${filename}`);
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

  const diffLab = activeDiff
    ? workspace.labs.find((l) => l.id === activeDiff.labId) || null
    : null;

  return (
    <>
      <div className="screen-only-app h-screen w-screen overflow-hidden flex flex-col bg-[#F1F5F9]">
        <TopBar
          activeView={activeView}
          onChangeView={setActiveView}
          onOpenExport={() => setShowExportModal(true)}
        />

        {/* Workspace Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeView === 'editor' && activeLab && activeLayout && (
            <>
              <EditorToolbar
                courseCode={activeCourse?.code}
                labNumber={activeLab.labNumber}
                labTitle={activeLab.title}
                audienceMode={audienceMode}
                onChangeAudience={setAudienceMode}
                showDocumentsDrawer={showDocumentsDrawer}
                onToggleDocumentsDrawer={() => setShowDocumentsDrawer((v) => !v)}
                showDetailsDrawer={showDetailsDrawer}
                onToggleDetailsDrawer={() => setShowDetailsDrawer((v) => !v)}
                canUndo={history.length > 0}
                onUndo={handleUndo}
                instructorHiddenCount={instructorHiddenCount}
                savedLabel={savedLabel}
              />

              <div className="flex-1 flex min-h-0 overflow-hidden relative">
                {/* On-Demand Left Documents Drawer */}
                {showDocumentsDrawer && (
                  <Sidebar
                    courses={workspace.courses}
                    labs={workspace.labs}
                    modules={workspace.modules}
                    activeLabId={activeLab.id}
                    onSelectLab={(id) => {
                      commitWorkspace((prev) => ({ ...prev, activeLabId: id }), false);
                      setSelectedBlockId(null);
                    }}
                    onOpenNewLab={(cid) =>
                      setNewLabCourseId(
                        cid || activeLab.courseId || workspace.courses[0]?.id || ''
                      )
                    }
                    onOpenNewCourse={() => setShowNewCourseModal(true)}
                    onDuplicateLab={handleDuplicateLab}
                    onDeleteLab={handleDeleteLab}
                    onJumpToBlock={(blockId) => {
                      setSelectedBlockId(blockId);
                      document
                        .getElementById(`block-${blockId}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    onClose={() => setShowDocumentsDrawer(false)}
                  />
                )}

                {/* Centered Distraction-Free Paper Canvas */}
                <PaperCanvas
                  lab={activeLab}
                  course={activeCourse}
                  layout={activeLayout}
                  audienceMode={audienceMode}
                  variables={resolvedVariables}
                  showRawTokens={showRawTokens}
                  modules={workspace.modules}
                  selectedBlockId={selectedBlockId}
                  zoom={zoom}
                  onSelectBlock={setSelectedBlockId}
                  onUpdateLabMeta={(patch) =>
                    updateActiveLab((lab) => ({ ...lab, ...patch }), false)
                  }
                  onUpdateBlock={handleUpdateBlock}
                  onMoveBlock={handleMoveBlock}
                  onDuplicateBlock={handleDuplicateBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onInsertBlockAt={handleInsertBlockAt}
                  onEditMasterModule={(moduleId) => openSetupSection('modules', moduleId)}
                  onDetachModule={handleDetachModule}
                />

                {/* On-Demand Right Details Drawer */}
                {showDetailsDrawer && (
                  <DetailsDrawer
                    lab={activeLab}
                    courses={workspace.courses}
                    layoutProfiles={workspace.layoutProfiles}
                    effectiveLayout={activeLayout}
                    showRawTokens={showRawTokens}
                    onToggleRawTokens={() => setShowRawTokens((v) => !v)}
                    zoom={zoom}
                    onChangeZoom={setZoom}
                    onUpdateLab={(patch) => updateActiveLab((lab) => ({ ...lab, ...patch }))}
                    onCreateSnapshot={(sem, lbl, note) =>
                      handleCreateSnapshotForLab(activeLab.id, sem, lbl, note)
                    }
                    onOpenSnapshotDiff={(snap) =>
                      setActiveDiff({ labId: activeLab.id, snapshot: snap })
                    }
                    onOpenCourseSetup={(sec) => openSetupSection(sec)}
                    onClose={() => setShowDetailsDrawer(false)}
                  />
                )}
              </div>
            </>
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
            />
          )}
        </div>

        {/* Modals */}
        {showExportModal && activeLab && activeLayout && (
          <ExportModal
            lab={activeLab}
            course={activeCourse}
            layout={activeLayout}
            defaultAudience={audienceMode}
            onClose={() => setShowExportModal(false)}
            onPrintPdf={handlePrintPdf}
            onDownloadHtml={handleDownloadHtml}
            onExportBackupJson={() => {
              exportWorkspaceJson(workspace);
              showToast('Downloaded LabPress JSON backup');
            }}
            onImportBackupJson={handleImportBackupJson}
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
        globalVariables={workspace.globalVariables}
        modules={workspace.modules}
        audienceMode={printEdition}
      />
    </>
  );
}
