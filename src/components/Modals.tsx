import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Braces,
  Download,
  FileCode2,
  FileJson,
  FileText,
  Layers,
  Printer,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import {
  AudienceMode,
  CodePrintTheme,
  Course,
  DocKind,
  LabBlock,
  LabDocument,
  LabSnapshot,
  LayoutProfile,
  PageSetup,
  ReusableModule,
} from '../types/lab';
import { LabTemplateKind } from '../lib/blockFactory';
import { diffSnapshotWithCurrent } from '../lib/diff';
import { formatPageSetupSummary } from '../lib/pageGeometry';
import { MissingVariableIssue } from '../lib/variables';
import { suggestNextSemester } from '../lib/exporter';

/* -------------------------------------------------------------------------- */
/*                                Export Modal                                */
/* -------------------------------------------------------------------------- */

interface ExportModalProps {
  lab: LabDocument;
  course?: Course;
  courseLabs: LabDocument[];
  layout: LayoutProfile;
  pageSetup: PageSetup;
  defaultAudience: AudienceMode;
  defaultCodePrintTheme: CodePrintTheme;
  missingVariables: MissingVariableIssue[];
  onJumpToVariables: () => void;
  onClose: () => void;
  onPrintPdf: (edition: AudienceMode, codePrintTheme: CodePrintTheme) => void;
  onDownloadHtml: (edition: AudienceMode, codePrintTheme: CodePrintTheme) => void;
  onDownloadMarkdown: (edition: AudienceMode) => void;
  onExportCourseZip: (opts: {
    editions: 'student' | 'instructor' | 'both';
    formats: { html: boolean; markdown: boolean };
    codePrintTheme: CodePrintTheme;
  }) => Promise<void>;
  onExportBackupJson: () => void;
  onImportBackupJson: (raw: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  lab,
  course,
  courseLabs,
  layout,
  pageSetup,
  defaultAudience,
  defaultCodePrintTheme,
  missingVariables,
  onJumpToVariables,
  onClose,
  onPrintPdf,
  onDownloadHtml,
  onDownloadMarkdown,
  onExportCourseZip,
  onExportBackupJson,
  onImportBackupJson,
}) => {
  const [tab, setTab] = useState<'document' | 'packet'>('document');
  const [edition, setEdition] = useState<AudienceMode>(defaultAudience);
  const [codePrintTheme, setCodePrintTheme] = useState<CodePrintTheme>(defaultCodePrintTheme);

  // Course Packet ZIP state
  const [packetEditions, setPacketEditions] = useState<'student' | 'instructor' | 'both'>('both');
  const [includeHtml, setIncludeHtml] = useState(true);
  const [includeMarkdown, setIncludeMarkdown] = useState(true);
  const [isZipping, setIsZipping] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportBackupJson(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleZipClick = async () => {
    if (!includeHtml && !includeMarkdown) return;
    setIsZipping(true);
    try {
      await onExportCourseZip({
        editions: packetEditions,
        formats: { html: includeHtml, markdown: includeMarkdown },
        codePrintTheme,
      });
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              Export &amp; Publish
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {course?.code} · {lab.labNumber}: {lab.title} · {layout.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-4 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md border border-slate-200/80">
            <button
              type="button"
              onClick={() => setTab('document')}
              className={`py-1.5 px-3 text-xs font-medium rounded transition-colors cursor-pointer ${
                tab === 'document'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Document
            </button>
            <button
              type="button"
              onClick={() => setTab('packet')}
              className={`py-1.5 px-3 text-xs font-medium rounded transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'packet'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              Course Packet (.zip)
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Missing Variables Warning Banner */}
          {missingVariables.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 min-w-0">
                  <div className="font-semibold">
                    {missingVariables.length} unresolved{' '}
                    {missingVariables.length === 1 ? 'variable' : 'variables'} in this document
                  </div>
                  <div className="text-amber-800 mt-0.5 break-words font-mono text-[11px]">
                    {missingVariables.map((v) => `{{${v.key}}}`).join(', ')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToVariables();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-amber-950 bg-white border border-amber-300 hover:bg-amber-100 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Braces className="w-3 h-3" />
                Fix in Variables
              </button>
            </div>
          )}

          {tab === 'document' ? (
            <>
              {/* Edition Selector */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-800">Select Edition</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEdition('student')}
                    className={`p-3 text-left rounded-md border transition-colors cursor-pointer ${
                      edition === 'student'
                        ? 'border-blue-600 bg-blue-50/60'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">Student Handout</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Hides instructor notes &amp; reveals lined answer boxes
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdition('instructor')}
                    className={`p-3 text-left rounded-md border transition-colors cursor-pointer ${
                      edition === 'instructor'
                        ? 'border-amber-600 bg-amber-50/70'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">Instructor Key</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Includes pacing notes, answer keys &amp; grading rubrics
                    </div>
                  </button>
                </div>
              </div>

              {/* Code Print Theme Toggle */}
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Code Block Print Style
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Applies to PDF printouts and printed HTML pages
                  </div>
                </div>
                <div className="inline-flex items-center p-0.5 bg-white border border-slate-200 rounded-md shrink-0">
                  <button
                    type="button"
                    onClick={() => setCodePrintTheme('light')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      codePrintTheme === 'light'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ink-Saving Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodePrintTheme('dark')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      codePrintTheme === 'dark'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dark Editor
                  </button>
                </div>
              </div>

              {/* Primary Publishing Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => onPrintPdf(edition, codePrintTheme)}
                  className="flex flex-col items-start gap-1.5 p-3.5 rounded-md border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 transition-colors text-left cursor-pointer"
                >
                  <Printer className="w-5 h-5 text-blue-700" />
                  <span className="text-xs font-semibold text-slate-900">
                    Print / Save PDF
                  </span>
                  <span className="text-[11px] text-slate-500 leading-snug">
                    {formatPageSetupSummary(pageSetup)} vector pages matching editor
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDownloadHtml(edition, codePrintTheme)}
                  className="flex flex-col items-start gap-1.5 p-3.5 rounded-md border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 transition-colors text-left cursor-pointer"
                >
                  <FileCode2 className="w-5 h-5 text-teal-700" />
                  <span className="text-xs font-semibold text-slate-900">
                    Standalone HTML
                  </span>
                  <span className="text-[11px] text-slate-500 leading-snug">
                    Self-contained LMS file with math &amp; copyable code
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDownloadMarkdown(edition)}
                  className="flex flex-col items-start gap-1.5 p-3.5 rounded-md border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 transition-colors text-left cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-slate-700" />
                  <span className="text-xs font-semibold text-slate-900">
                    Markdown (.md)
                  </span>
                  <span className="text-[11px] text-slate-500 leading-snug">
                    Clean Git / Canvas / Pandoc-ready document
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    {course ? `${course.code} — ${course.title}` : 'Current Course'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    {course?.semester} · {courseLabs.length}{' '}
                    {courseLabs.length === 1 ? 'document' : 'documents'} bundled into one archive
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-800">Editions to Include</div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'student', label: 'Student Only' },
                      { id: 'instructor', label: 'Answer Keys' },
                      { id: 'both', label: 'Both (Folders)' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPacketEditions(opt.id)}
                      className={`py-2 px-2.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                        packetEditions === opt.id
                          ? 'border-blue-600 bg-blue-50/60 text-blue-900'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-800">File Formats</div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeHtml}
                      onChange={(e) => setIncludeHtml(e.target.checked)}
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    Standalone HTML (.html)
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeMarkdown}
                      onChange={(e) => setIncludeMarkdown(e.target.checked)}
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    Markdown (.md)
                  </label>
                </div>
              </div>

              {includeHtml && (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-xs font-medium text-slate-700">HTML Code Print Style</span>
                  <div className="inline-flex items-center p-0.5 bg-white border border-slate-200 rounded-md">
                    <button
                      type="button"
                      onClick={() => setCodePrintTheme('light')}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                        codePrintTheme === 'light'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ink-Saving Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodePrintTheme('dark')}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                        codePrintTheme === 'dark'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Dark Editor
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={isZipping || (!includeHtml && !includeMarkdown) || courseLabs.length === 0}
                onClick={handleZipClick}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:pointer-events-none rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {isZipping
                  ? 'Building Course ZIP...'
                  : `Download Course Packet (${courseLabs.length} ${courseLabs.length === 1 ? 'doc' : 'docs'})`}
              </button>
            </div>
          )}

          {/* Local Storage Backup */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                Local Workspace Backup (JSON)
              </span>
              <span className="text-[11px] text-slate-400">
                Saved locally in browser
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onExportBackupJson}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5" />
                Export Full Backup
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Backup JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                         Save Block as Module Modal                         */
/* -------------------------------------------------------------------------- */

function suggestModuleTitle(block: LabBlock): string {
  switch (block.type) {
    case 'heading':
      return block.text.trim() || 'Shared Heading';
    case 'steps':
      return block.title.trim() || 'Shared Procedure';
    case 'code':
      return block.title.trim() || 'Shared Code Snippet';
    case 'callout':
      return block.title.trim() || 'Shared Notice';
    case 'table':
      return block.caption.trim() || 'Shared Reference Table';
    case 'checklist':
      return block.title.trim() || 'Shared Submission Checklist';
    case 'image':
      return block.caption.trim() || 'Shared Diagram';
    case 'math':
      return block.label.trim() ? `Equation ${block.label.trim()}` : 'Shared Equation';
    case 'response':
      return block.prompt.trim().slice(0, 48) || 'Shared Question';
    case 'paragraph':
      return block.text.trim().slice(0, 48) || 'Shared Text Section';
    default:
      return 'Shared Module';
  }
}

interface SaveAsModuleModalProps {
  block: LabBlock;
  onClose: () => void;
  onConfirm: (params: {
    title: string;
    category: string;
    description: string;
    replaceWithLink: boolean;
  }) => void;
}

export const SaveAsModuleModal: React.FC<SaveAsModuleModalProps> = ({
  block,
  onClose,
  onConfirm,
}) => {
  const [title, setTitle] = useState(() => suggestModuleTitle(block));
  const [category, setCategory] = useState('Lab Procedure');
  const [description, setDescription] = useState('');
  const [replaceWithLink, setReplaceWithLink] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      title: title.trim() || 'Shared Module',
      category: category.trim() || 'General',
      description: description.trim(),
      replaceWithLink,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Save as Shared Module
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Promote this section to your Shared Modules library so it can be reused and updated across multiple labs from one source of truth.
          </p>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Module Title</span>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Git Submission Rules"
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="Lab Procedure">Lab Procedure</option>
              <option value="Course Policy">Course Policy</option>
              <option value="Setup Guide">Setup Guide</option>
              <option value="Submission Checklist">Submission Checklist</option>
              <option value="Reference">Reference</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Description (optional)</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Where and how this module should be used..."
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-md bg-teal-50/70 border border-teal-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceWithLink}
              onChange={(e) => setReplaceWithLink(e.target.checked)}
              className="mt-0.5 rounded border-teal-400 text-teal-700 focus:ring-teal-600"
            />
            <span className="text-xs text-teal-950 leading-snug">
              <strong className="font-semibold">Replace this block with a synced module link</strong>
              <span className="block text-[11px] text-teal-800 mt-0.5">
                Future edits to the Shared Module will automatically update this document.
              </span>
            </span>
          </label>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 bg-white rounded-md cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
          >
            Save Shared Module
          </button>
        </div>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                          Semester Rollover Modal                           */
/* -------------------------------------------------------------------------- */

interface SemesterRolloverModalProps {
  course: Course;
  labCount: number;
  onClose: () => void;
  onConfirm: (params: {
    code: string;
    nextSemester: string;
    professor: string;
    snapshotBeforeRollover: boolean;
  }) => void;
}

export const SemesterRolloverModal: React.FC<SemesterRolloverModalProps> = ({
  course,
  labCount,
  onClose,
  onConfirm,
}) => {
  const [code, setCode] = useState(course.code);
  const [nextSemester, setNextSemester] = useState(() => suggestNextSemester(course.semester));
  const [professor, setProfessor] = useState(course.professor);
  const [snapshotBeforeRollover, setSnapshotBeforeRollover] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      code: code.trim() || course.code,
      nextSemester: nextSemester.trim() || suggestNextSemester(course.semester),
      professor: professor.trim() || course.professor,
      snapshotBeforeRollover,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Roll Over Course to New Semester
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Clones <strong>{course.code}</strong> ({course.semester}) and all{' '}
            <strong>
              {labCount} {labCount === 1 ? 'document' : 'documents'}
            </strong>{' '}
            into a fresh term with updated <code className="font-mono">{`{{semester}}`}</code> variables, while leaving the original term intact.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Course Code</span>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
            <label className="col-span-2 block space-y-1">
              <span className="text-xs font-medium text-slate-600">New Semester</span>
              <input
                type="text"
                required
                autoFocus
                value={nextSemester}
                onChange={(e) => setNextSemester(e.target.value)}
                placeholder="e.g. Spring 2027"
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Instructor</span>
            <input
              type="text"
              required
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={snapshotBeforeRollover}
              onChange={(e) => setSnapshotBeforeRollover(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span className="text-xs text-slate-800 leading-snug">
              <strong className="font-semibold">
                Archive snapshot on existing {course.semester} documents first
              </strong>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Preserves a clean historical baseline before rolling over.
              </span>
            </span>
          </label>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 bg-white rounded-md cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
          >
            Roll Over Course
          </button>
        </div>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                           Snapshot Diff Modal                              */
/* -------------------------------------------------------------------------- */

interface SnapshotDiffModalProps {
  snapshot: LabSnapshot;
  currentLab: LabDocument;
  modules: ReusableModule[];
  onClose: () => void;
  onRestore: (snapshot: LabSnapshot) => void;
}

export const SnapshotDiffModal: React.FC<SnapshotDiffModalProps> = ({
  snapshot,
  currentLab,
  modules,
  onClose,
  onRestore,
}) => {
  const diff = diffSnapshotWithCurrent(snapshot, currentLab, modules);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const visibleBlocks = showUnchanged
    ? diff.blocks
    : diff.blocks.filter((b) => b.status !== 'unchanged');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] bg-white border border-slate-200 rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Semester Change Comparison
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Comparing snapshot <strong>{snapshot.label}</strong> ({snapshot.semester}) against current draft
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close diff viewer"
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-teal-800">+{diff.counts.added} Added</span>
            <span className="font-semibold text-amber-800">~{diff.counts.modified} Modified</span>
            <span className="font-semibold text-red-700">-{diff.counts.removed} Removed</span>
            <span className="text-slate-500">{diff.counts.unchanged} Unchanged</span>
          </div>
          <label className="inline-flex items-center gap-1.5 text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="rounded border-slate-300"
            />
            Show unchanged blocks
          </label>
        </div>

        {/* Diff Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {diff.metadataChanges.length > 0 && (
            <div className="border border-amber-200 bg-amber-50/60 rounded-md p-4 space-y-2">
              <div className="text-xs font-semibold text-amber-900">Header Metadata Changes</div>
              {diff.metadataChanges.map((mc) => (
                <div key={mc.field} className="text-xs grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="text-slate-600">
                    <span className="font-medium text-slate-800">{mc.field} (Snapshot): </span>
                    <span className="line-through text-red-700">{mc.before}</span>
                  </div>
                  <div className="text-slate-600">
                    <span className="font-medium text-slate-800">{mc.field} (Current): </span>
                    <span className="text-teal-800 font-medium">{mc.after}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {visibleBlocks.length === 0 && diff.metadataChanges.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              The current draft matches this snapshot exactly—no changes detected.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleBlocks.map((item) => {
                const statusStyle =
                  item.status === 'added'
                    ? 'border-teal-200 bg-teal-50/50'
                    : item.status === 'removed'
                      ? 'border-red-200 bg-red-50/50'
                      : item.status === 'modified'
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-slate-200 bg-white';

                const statusLabel =
                  item.status === 'added'
                    ? 'Added in Current Draft'
                    : item.status === 'removed'
                      ? 'Removed Since Snapshot'
                      : item.status === 'modified'
                        ? 'Modified'
                        : 'Unchanged';

                return (
                  <div key={item.blockId} className={`rounded-md border p-3.5 space-y-2 ${statusStyle}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">{item.label}</span>
                      <span className="font-medium text-slate-700">{statusLabel}</span>
                    </div>

                    {item.status === 'modified' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white/90 border border-slate-200 rounded p-2.5">
                          <div className="text-[11px] font-semibold text-slate-500 mb-1">
                            Snapshot ({snapshot.semester})
                          </div>
                          <div className="text-slate-700 whitespace-pre-wrap break-words">
                            {item.beforeSummary}
                          </div>
                        </div>
                        <div className="bg-white/90 border border-slate-200 rounded p-2.5">
                          <div className="text-[11px] font-semibold text-slate-500 mb-1">
                            Current Draft
                          </div>
                          <div className="text-slate-900 whitespace-pre-wrap break-words">
                            {item.afterSummary}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-700 whitespace-pre-wrap break-words">
                        {item.afterSummary || item.beforeSummary}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            Restoring automatically saves a safety backup of your current draft first.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 rounded-md cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onRestore(snapshot)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Snapshot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               New Lab Modal                                */
/* -------------------------------------------------------------------------- */

interface NewLabModalProps {
  courses: Course[];
  defaultCourseId: string;
  onClose: () => void;
  onCreate: (params: {
    courseId: string;
    docKind: DocKind;
    labNumber: string;
    title: string;
    subtitle: string;
    estimatedTime: string;
    template: LabTemplateKind;
  }) => void;
}

export const NewLabModal: React.FC<NewLabModalProps> = ({
  courses,
  defaultCourseId,
  onClose,
  onCreate,
}) => {
  const [courseId, setCourseId] = useState(defaultCourseId || courses[0]?.id || '');
  const [docKind, setDocKind] = useState<DocKind>('lab');
  const [labNumber, setLabNumber] = useState('Lab 06');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('60 min');
  const [template, setTemplate] = useState<LabTemplateKind>('programming');

  const handleKindChange = (nextKind: DocKind) => {
    setDocKind(nextKind);
    if (nextKind === 'homework') {
      setLabNumber('HW 03');
      setTemplate('worksheet');
    } else if (nextKind === 'guide') {
      setLabNumber('Guide 01');
      setTemplate('programming');
    } else {
      setLabNumber('Lab 06');
      setTemplate('programming');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      courseId,
      docKind,
      labNumber: labNumber.trim() || 'Lab 01',
      title: title.trim() || 'Untitled Document',
      subtitle: subtitle.trim(),
      estimatedTime: estimatedTime.trim() || '60 min',
      template,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Create New Document</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Document Type</span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-md">
              {(
                [
                  { id: 'lab', label: 'Lab Manual' },
                  { id: 'homework', label: 'Homework' },
                  { id: 'guide', label: 'Instruction Sheet' },
                ] as Array<{ id: DocKind; label: string }>
              ).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => handleKindChange(k.id)}
                  className={`py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                    docKind === k.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Course</span>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} ({c.semester}) — {c.title} ({c.professor})
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Label / #</span>
              <input
                type="text"
                value={labNumber}
                onChange={(e) => setLabNumber(e.target.value)}
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
            <label className="col-span-2 block space-y-1">
              <span className="text-xs font-medium text-slate-600">Estimated Time</span>
              <input
                type="text"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Title</span>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Docker Containers & Port Mapping"
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Subtitle (optional)</span>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Brief focus or tools covered..."
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Starter Structure</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'programming', label: 'Programming / CS Lab' },
                  { id: 'networking', label: 'IT / Networking Lab' },
                  { id: 'worksheet', label: 'Homework / Worksheet' },
                  { id: 'blank', label: 'Blank Page' },
                ] as Array<{ id: LabTemplateKind; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTemplate(opt.id)}
                  className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-colors cursor-pointer ${
                    template === opt.id
                      ? 'bg-blue-50 border-blue-600 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 bg-white rounded-md cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
          >
            Create Document
          </button>
        </div>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              New Course Modal                              */
/* -------------------------------------------------------------------------- */

interface NewCourseModalProps {
  layoutProfiles: LayoutProfile[];
  onClose: () => void;
  onCreate: (params: {
    code: string;
    title: string;
    professor: string;
    semester: string;
    defaultLayoutId: string;
  }) => void;
}

export const NewCourseModal: React.FC<NewCourseModalProps> = ({
  layoutProfiles,
  onClose,
  onCreate,
}) => {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [professor, setProfessor] = useState('');
  const [semester, setSemester] = useState('Fall 2026');
  const [defaultLayoutId, setDefaultLayoutId] = useState(layoutProfiles[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      code: code.trim() || 'CS 101',
      title: title.trim() || 'New Course',
      professor: professor.trim() || 'Instructor',
      semester: semester.trim() || 'Fall 2026',
      defaultLayoutId,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Create New Course</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Course Code</span>
              <input
                type="text"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="IT 410"
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
            <label className="col-span-2 block space-y-1">
              <span className="text-xs font-medium text-slate-600">Semester</span>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Course Title</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cloud Infrastructure & DevOps"
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Professor</span>
            <input
              type="text"
              required
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              placeholder="Prof. Jordan Patel"
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Default Layout Profile</span>
            <select
              value={defaultLayoutId}
              onChange={(e) => setDefaultLayoutId(e.target.value)}
              className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
            >
              {layoutProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.professorName})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 bg-white rounded-md cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
          >
            Create Course
          </button>
        </div>
      </form>
    </div>
  );
};

export { Download };
