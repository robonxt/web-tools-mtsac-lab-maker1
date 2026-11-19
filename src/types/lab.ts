export type WorkspaceView = 'editor' | 'setup';

export type SetupSection = 'layouts' | 'variables' | 'modules' | 'snapshots';

export type DocKind = 'lab' | 'homework' | 'guide';

export type AudienceMode = 'student' | 'instructor';

export type BlockAudience = 'all' | 'instructor';

export type HeaderVariant = 'banner' | 'editorial' | 'grid';

export type FontChoice = 'sans' | 'serif';

export type StepStyle = 'numbered' | 'stepped' | 'minimal';

export type DensityChoice = 'comfortable' | 'compact';

export type PageSizeId = 'letter' | 'a4' | 'legal' | 'a5' | 'tabloid';

export type PageOrientation = 'portrait' | 'landscape';

export type MarginPreset = 'narrow' | 'moderate' | 'normal' | 'wide' | 'custom';

export interface PageMargins {
  top: number; // inches
  right: number; // inches
  bottom: number; // inches
  left: number; // inches
}

export interface PageSetup {
  size: PageSizeId;
  orientation: PageOrientation;
  marginPreset: MarginPreset;
  margins: PageMargins;
  showRunningHeader: boolean;
}

export interface LayoutProfile {
  id: string;
  name: string;
  professorName: string;
  department: string;
  headerVariant: HeaderVariant;
  fontFamily: FontChoice;
  accentColor: string;
  stepStyle: StepStyle;
  density: DensityChoice;
  showPageNumbers: boolean;
  footerTemplate: string;
  pageSetup?: PageSetup;
}

export interface StepItem {
  id: string;
  title: string;
  body: string;
  minutes?: string;
  checkpoint?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked?: boolean;
}

export interface BaseBlock {
  id: string;
  audience: BlockAudience;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  text: string;
}

export interface StepsBlock extends BaseBlock {
  type: 'steps';
  title: string;
  startNumber: number;
  items: StepItem[];
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  language: string;
  title: string;
  code: string;
  expectedOutput: string;
}

export type CalloutVariant = 'info' | 'tip' | 'caution' | 'prereq';

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  variant: CalloutVariant;
  title: string;
  body: string;
}

export interface TableBlock extends BaseBlock {
  type: 'table';
  caption: string;
  headers: string[];
  rows: string[][];
}

export interface ResponseBlock extends BaseBlock {
  type: 'response';
  prompt: string;
  points: number;
  answerLines: number;
  instructorSolution: string;
}

export interface ChecklistBlock extends BaseBlock {
  type: 'checklist';
  title: string;
  items: ChecklistItem[];
}

export interface ModuleRefBlock extends BaseBlock {
  type: 'moduleRef';
  moduleId: string;
}

export interface PageBreakBlock extends BaseBlock {
  type: 'pageBreak';
  label: string;
}

export type LabBlock =
  | HeadingBlock
  | ParagraphBlock
  | StepsBlock
  | CodeBlock
  | CalloutBlock
  | TableBlock
  | ResponseBlock
  | ChecklistBlock
  | ModuleRefBlock
  | PageBreakBlock;

export type LabBlockType = LabBlock['type'];

export interface ReusableModule {
  id: string;
  title: string;
  category: string;
  description: string;
  blocks: LabBlock[];
  updatedAt: string;
}

export interface LabSnapshotState {
  docKind?: DocKind;
  labNumber: string;
  title: string;
  subtitle: string;
  estimatedTime: string;
  layoutProfileId: string;
  layoutOverrideId?: string | null;
  pageSetupOverride?: PageSetup | null;
  blocks: LabBlock[];
}

export interface LabSnapshot {
  id: string;
  semester: string;
  label: string;
  note: string;
  createdAt: string;
  state: LabSnapshotState;
}

export interface LabDocument {
  id: string;
  courseId: string;
  docKind?: DocKind;
  labNumber: string;
  title: string;
  subtitle: string;
  estimatedTime: string;
  layoutProfileId: string;
  /** Optional per-document override; when unset, inherits Course.defaultLayoutId */
  layoutOverrideId?: string | null;
  /** Optional per-document page setup override; when unset, inherits LayoutProfile.pageSetup */
  pageSetupOverride?: PageSetup | null;
  blocks: LabBlock[];
  snapshots: LabSnapshot[];
  updatedAt: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  professor: string;
  semester: string;
  defaultLayoutId: string;
  variables: Record<string, string>;
}

export interface WorkspaceState {
  schemaVersion: number;
  globalVariables: Record<string, string>;
  layoutProfiles: LayoutProfile[];
  courses: Course[];
  modules: ReusableModule[];
  labs: LabDocument[];
  activeLabId: string;
}

export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

export interface BlockDiffItem {
  blockId: string;
  status: DiffStatus;
  blockType: LabBlockType;
  label: string;
  beforeSummary?: string;
  afterSummary?: string;
}
