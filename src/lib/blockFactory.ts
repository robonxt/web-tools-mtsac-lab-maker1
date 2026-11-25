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
        text: '1. Objectives',
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'paragraph',
        text: 'Summarize the core learning goals for this lab in {{course_code}} ({{semester}}).',
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
        text: '1. Overview & Objectives',
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'paragraph',
        text: 'In this lab, you will implement, test, and benchmark a modular solution using `{{runtime_version}}` on `{{vm_host}}`.',
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'callout',
        variant: 'info',
        title: 'Instructor Pacing Note',
        body: 'Walk through the starter repository structure for 5 minutes before students begin Part 2.',
        audience: 'instructor',
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
        title: '2. Implementation Steps',
        startNumber: 1,
        audience: 'all',
        items: [
          {
            id: createId('stp'),
            title: 'Clone starter files',
            body: 'Pull the lab starter folder from `{{lms_url}}` into your workspace.',
            minutes: '5 min',
            checkpoint: 'Confirm unit tests execute before editing.',
          },
          {
            id: createId('stp'),
            title: 'Implement core function',
            body: 'Complete the required algorithm and handle edge cases cleanly.',
            minutes: '25 min',
            checkpoint: 'All sample assertions pass.',
          },
        ],
      },
      {
        id: createId('blk'),
        type: 'code',
        language: 'python',
        title: 'Verification Test Command',
        code: 'pytest -v tests/test_lab.py',
        expectedOutput: 'tests/test_lab.py::test_core PASSED [100%]',
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'response',
        prompt: 'What is the time complexity of your solution, and which edge case was hardest to handle?',
        points: 10,
        answerLines: 4,
        instructorSolution: 'Expect O(n log n) or O(n) depending on structure; look for empty-input handling.',
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
        text: '1. Topology & Prerequisites',
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'checklist',
        title: 'Lab Environment Checklist',
        audience: 'all',
        items: [
          { id: createId('chk'), text: 'Lab virtual switch & router image booted' },
          { id: createId('chk'), text: 'Management console reachable at {{vm_host}}' },
          { id: createId('chk'), text: 'Packet capture tool ready for verification' },
        ],
      },
      {
        id: createId('blk'),
        type: 'table',
        caption: 'Addressing & Interface Plan',
        headers: ['Device', 'Interface', 'IP Address / Mask', 'Purpose'],
        rows: [
          ['SW-CORE-01', 'VLAN 10', '10.10.10.1 /24', 'Student Workstation LAN'],
          ['SW-CORE-01', 'VLAN 20', '10.10.20.1 /24', 'Server Segment'],
          ['RTR-EDGE-01', 'Gi0/0', '10.10.99.1 /30', 'Uplink Transit'],
        ],
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'code',
        language: 'cisco',
        title: 'Starter CLI Verification',
        code: 'show vlan brief\nshow ip interface brief',
        expectedOutput: 'VLAN 10 active — Gi0/1, Gi0/2\nVLAN 20 active — Gi0/3',
        audience: 'all',
      },
      {
        id: createId('blk'),
        type: 'response',
        prompt: 'Record the ping test results between VLAN 10 and VLAN 20 before and after enabling routing.',
        points: 15,
        answerLines: 4,
        instructorSolution: 'Before routing: 100% packet loss (Request timed out). After router-on-a-stick subinterface config: 0% loss, RTT < 2ms.',
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
      text: 'Lab Worksheet & Guided Questions',
      audience: 'all',
    },
    {
      id: createId('blk'),
      type: 'paragraph',
      text: 'Complete each observation and submit this sheet via {{lms_url}} before {{due_day}}.',
      audience: 'all',
    },
    {
      id: createId('blk'),
      type: 'response',
      prompt: 'Question 1: Record your initial hypothesis or system baseline before making changes.',
      points: 10,
      answerLines: 4,
      instructorSolution: 'Check for specific baseline measurements or clear reasoning.',
      audience: 'all',
    },
    {
      id: createId('blk'),
      type: 'table',
      caption: 'Observation Log',
      headers: ['Trial / Case', 'Input / Setting', 'Observed Result', 'Notes'],
      rows: [
        ['Case A', '', '', ''],
        ['Case B', '', '', ''],
        ['Case C', '', '', ''],
      ],
      audience: 'all',
    },
  ];
}
