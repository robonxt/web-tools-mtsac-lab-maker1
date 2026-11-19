import { Course, LabBlock, LabDocument, ReusableModule } from '../types/lab';

export const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function buildVariableMap(
  globalVariables: Record<string, string>,
  course?: Course,
  lab?: LabDocument
): Record<string, string> {
  const merged: Record<string, string> = {
    ...globalVariables,
  };
  if (course) {
    merged.course_code = course.code;
    merged.course_title = course.title;
    merged.professor = course.professor;
    merged.semester = course.semester;
    Object.assign(merged, course.variables);
  }
  if (lab) {
    merged.lab_number = lab.labNumber;
    merged.lab_title = lab.title;
    merged.estimated_time = lab.estimatedTime;
  }
  return merged;
}

export function resolveVariables(
  text: string,
  variables: Record<string, string>,
  showRawTokens = false
): string {
  if (!text || showRawTokens) return text;
  return text.replace(VARIABLE_REGEX, (match, key: string) => {
    const value = variables[key];
    return value !== undefined && value !== '' ? value : match;
  });
}

export function extractVariableKeysFromText(text: string): string[] {
  const keys = new Set<string>();
  if (!text) return [];
  let m: RegExpExecArray | null;
  const regex = new RegExp(VARIABLE_REGEX.source, 'g');
  while ((m = regex.exec(text)) !== null) {
    keys.add(m[1]);
  }
  return Array.from(keys);
}

export function collectBlockTexts(block: LabBlock): string[] {
  switch (block.type) {
    case 'heading':
      return [block.text];
    case 'paragraph':
      return [block.text];
    case 'steps':
      return [
        block.title,
        ...block.items.flatMap((i) => [i.title, i.body, i.checkpoint || '']),
      ];
    case 'code':
      return [block.title, block.code, block.expectedOutput];
    case 'callout':
      return [block.title, block.body];
    case 'table':
      return [block.caption, ...block.headers, ...block.rows.flat()];
    case 'response':
      return [block.prompt, block.instructorSolution];
    case 'checklist':
      return [block.title, ...block.items.map((i) => i.text)];
    case 'moduleRef':
      return [];
    case 'pageBreak':
      return [block.label];
  }
}

export function computeVariableUsage(
  labs: LabDocument[],
  modules: ReusableModule[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  const moduleMap = new Map(modules.map((m) => [m.id, m]));

  for (const lab of labs) {
    const labKeys = new Set<string>();
    const addFromText = (t: string) => {
      for (const k of extractVariableKeysFromText(t)) {
        labKeys.add(k);
      }
    };
    addFromText(lab.title);
    addFromText(lab.subtitle);
    for (const blk of lab.blocks) {
      if (blk.type === 'moduleRef') {
        const mod = moduleMap.get(blk.moduleId);
        if (mod) {
          for (const mb of mod.blocks) {
            for (const txt of collectBlockTexts(mb)) addFromText(txt);
          }
        }
      } else {
        for (const txt of collectBlockTexts(blk)) addFromText(txt);
      }
    }
    for (const k of labKeys) {
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  return counts;
}

export interface InlineToken {
  kind: 'text' | 'bold' | 'italic' | 'code' | 'varResolved' | 'varMissing';
  content: string;
  rawKey?: string;
}

/**
 * Parses lightweight inline formatting (**bold**, *italic*, `code`, and {{var}})
 * into clean React-renderable tokens without using dangerouslySetInnerHTML.
 */
export function parseInlineRichText(
  text: string,
  variables: Record<string, string>,
  showRawTokens: boolean
): InlineToken[] {
  if (!text) return [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\{\{\s*[a-zA-Z0-9_.-]+\s*\}\})/g;
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: 'text', content: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push({
        kind: 'bold',
        content: resolveVariables(raw.slice(2, -2), variables, showRawTokens),
      });
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      tokens.push({
        kind: 'italic',
        content: resolveVariables(raw.slice(1, -1), variables, showRawTokens),
      });
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push({
        kind: 'code',
        content: resolveVariables(raw.slice(1, -1), variables, showRawTokens),
      });
    } else if (raw.startsWith('{{') && raw.endsWith('}}')) {
      const key = raw.slice(2, -2).trim();
      const val = variables[key];
      if (showRawTokens) {
        tokens.push({
          kind: val ? 'varResolved' : 'varMissing',
          content: `{{${key}}}`,
          rawKey: key,
        });
      } else if (val !== undefined && val !== '') {
        tokens.push({ kind: 'text', content: val });
      } else {
        tokens.push({ kind: 'varMissing', content: `{{${key}}}`, rawKey: key });
      }
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ kind: 'text', content: text.slice(lastIndex) });
  }
  return tokens;
}
