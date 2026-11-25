import { LabBlock, LabBlockType } from '../types/lab';

export function createId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

export function createDefaultBlock(type: LabBlockType, moduleId?: string): LabBlock {
  const id = createId('blk');
  switch (type) {
    case 'heading':
      return {
        id,
        type: 'heading',
        level: 2,
        text: '',
        audience: 'all',
      };
    case 'paragraph':
      return {
        id,
        type: 'paragraph',
        text: '',
        audience: 'all',
      };
    case 'steps':
      return {
        id,
        type: 'steps',
        title: 'Steps',
        startNumber: 1,
        audience: 'all',
        items: [
          {
            id: createId('stp'),
            title: '',
            body: '',
            minutes: '',
            checkpoint: '',
          },
        ],
      };
    case 'code':
      return {
        id,
        type: 'code',
        language: 'bash',
        title: '',
        code: '',
        expectedOutput: '',
        showLineNumbers: true,
        audience: 'all',
      };
    case 'callout':
      return {
        id,
        type: 'callout',
        variant: 'tip',
        title: '',
        body: '',
        audience: 'all',
      };
    case 'table':
      return {
        id,
        type: 'table',
        caption: '',
        headers: ['Column 1', 'Column 2'],
        rows: [['', '']],
        audience: 'all',
      };
    case 'response':
      return {
        id,
        type: 'response',
        prompt: '',
        points: 10,
        answerLines: 4,
        instructorSolution: '',
        audience: 'all',
      };
    case 'checklist':
      return {
        id,
        type: 'checklist',
        title: 'Checklist',
        audience: 'all',
        items: [
          { id: createId('chk'), text: '' },
          { id: createId('chk'), text: 'Verified toolchain version matches {{semester}} syllabus' },
        ],
      };
    case 'image':
      return {
        id,
        type: 'image',
        src: '',
        alt: 'Lab diagram or figure',
        caption: 'Figure 1: System topology or experimental setup.',
        width: 85,
        align: 'center',
        bordered: true,
        audience: 'all',
      };
    case 'math':
      return {
        id,
        type: 'math',
        latex: 'T(n) = 2T\\left(\\frac{n}{2}\\right) + \\Theta(n) \\implies T(n) = \\Theta(n \\log n)',
        label: '(1)',
        audience: 'all',
      };
    case 'moduleRef':
      return {
        id,
        type: 'moduleRef',
        moduleId: moduleId || '',
        audience: 'all',
      };
    case 'pageBreak':
      return {
        id,
        type: 'pageBreak',
        label: 'Page Break',
        audience: 'all',
      };
  }
}

export function cloneBlockWithFreshIds(block: LabBlock): LabBlock {
  const copy = JSON.parse(JSON.stringify(block)) as LabBlock;
  copy.id = createId('blk');
  if (copy.type === 'steps') {
    copy.items = copy.items.map((item) => ({ ...item, id: createId('stp') }));
  }
  if (copy.type === 'checklist') {
    copy.items = copy.items.map((item) => ({ ...item, id: createId('chk') }));
  }
  return copy;
}

export type LabTemplateKind = 'blank' | 'programming' | 'networking' | 'worksheet';

export function buildTemplateBlocks(kind: LabTemplateKind, defaultModuleId?: string): LabBlock[] {
  if (kind === 'blank') {
    return [
      {
        id: createId('blk'),
        type: 'heading',
        level: 2,
        text: '',
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'paragraph',
        text: '',
        audience: 'all',
      },
    ];
  }

  if (kind === 'programming') {
    const blocks: LabBlock[] = [
      {
        id: createId('blk'),
        type: 'heading',
        level: 2,
        text: 'Objectives',
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'paragraph',
        text: '',
        audience: 'all',
      },
    ];
    if (defaultModuleId) {
      blocks.push({
        id: createId('blk'),
        type: 'moduleRef',
        moduleId: defaultModuleId,
        audience: 'all',
      });
    }
    blocks.push(
      {
        id: createId('blk'),
        type: 'steps',
        title: 'Procedure',
        startNumber: 1,
        audience: 'all',
        items: [
          {
            id: createId('stp'),
            title: '',
            body: '',
            minutes: '',
            checkpoint: '',
          },
        ],
      },
      {
        id: createId('blk'),
        type: 'code',
        language: 'python',
        title: '',
        code: '',
        expectedOutput: '',
        showLineNumbers: true,
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'response',
        prompt: '',
        points: 10,
        answerLines: 4,
        instructorSolution: '',
        audience: 'all',
      }
    );
    return blocks;
  }

  if (kind === 'networking') {
    return [
      {
        id: createId('blk'),
        type: 'heading',
        level: 2,
        text: 'Topology & Prerequisites',
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'checklist',
        title: 'Prerequisites',
        audience: 'all',
        items: [{ id: createId('chk'), text: '' }],
      },
      {
        id: createId('blk'),
        type: 'table',
        caption: 'Addressing Plan',
        headers: ['Device', 'Interface', 'IP Address', 'Purpose'],
        rows: [['', '', '', '']],
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'code',
        language: 'bash',
        title: '',
        code: '',
        expectedOutput: '',
        showLineNumbers: true,
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'response',
        prompt: '',
        points: 10,
        answerLines: 4,
        instructorSolution: '',
        audience: 'all',
      },
    ];
  }

  // worksheet
  return [
    {
      id: createId('blk'),
      type: 'heading',
      level: 2,
      text: 'Worksheet',
      audience: 'all',
    },
    {
      id: createId('blk'),
      type: 'paragraph',
      text: '',
      audience: 'all',
    },
    {
      id: createId('blk'),
      type: 'response',
      prompt: '',
      points: 10,
      answerLines: 4,
      instructorSolution: '',
      audience: 'all',
    },
    {
      id: createId('blk'),
      type: 'table',
      caption: 'Observation Log',
      headers: ['Case', 'Input', 'Result', 'Notes'],
      rows: [['', '', '', '']],
      audience: 'all',
    },
  ];
}
