export type SyntaxTokenKind =
  | 'plain'
  | 'comment'
  | 'string'
  | 'keyword'
  | 'number'
  | 'flag'
  | 'command'
  | 'property';

export interface SyntaxToken {
  kind: SyntaxTokenKind;
  text: string;
}

const LANGUAGE_KEYWORDS: Record<string, Set<string>> = {
  python: new Set([
    'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not',
    'and', 'or', 'import', 'from', 'as', 'with', 'try', 'except', 'finally',
    'raise', 'pass', 'break', 'continue', 'lambda', 'yield', 'True', 'False',
    'None', 'async', 'await', 'assert', 'global', 'nonlocal',
  ]),
  javascript: new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'switch', 'case', 'break', 'continue', 'class', 'extends', 'new', 'import',
    'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally',
    'throw', 'true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'this',
  ]),
  cpp: new Set([
    'int', 'long', 'double', 'float', 'char', 'bool', 'void', 'auto', 'const',
    'static', 'struct', 'class', 'public', 'private', 'protected', 'return',
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'include', 'using', 'namespace', 'std', 'template', 'typename', 'new',
    'delete', 'nullptr', 'true', 'false', 'sizeof', 'virtual', 'override',
  ]),
  sql: new Set([
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'JOIN', 'LEFT', 'RIGHT',
    'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'LIMIT',
    'AS', 'AND', 'OR', 'NOT', 'NULL', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
    'HAVING', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'INDEX', 'VIEW',
  ]),
  bash: new Set([
    'if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while', 'case',
    'esac', 'function', 'in', 'export', 'local', 'return', 'exit', 'echo', 'cd',
    'ls', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'awk', 'sed', 'chmod',
    'chown', 'sudo', 'ssh', 'scp', 'curl', 'git', 'docker', 'pytest', 'python3',
    'pip', 'npm', 'npx', 'ping', 'ip', 'ss', 'systemctl', 'journalctl', 'tar',
  ]),
  powershell: new Set([
    'if', 'else', 'elseif', 'foreach', 'for', 'while', 'function', 'param',
    'return', 'try', 'catch', 'finally', 'throw', 'Write-Host', 'Write-Output',
    'Get-ChildItem', 'Get-Process', 'Get-Service', 'Set-Location', 'Test-Connection',
    'Select-Object', 'Where-Object', 'ForEach-Object', 'Import-Module',
  ]),
  cisco: new Set([
    'enable', 'configure', 'terminal', 'interface', 'vlan', 'name', 'switchport',
    'mode', 'access', 'trunk', 'allowed', 'ip', 'address', 'no', 'shutdown',
    'exit', 'end', 'show', 'brief', 'running-config', 'startup-config', 'router',
    'ospf', 'network', 'area', 'hostname', 'line', 'vty', 'console', 'login',
    'password', 'encapsulation', 'dot1Q', 'copy', 'write', 'ping', 'traceroute',
  ]),
  yaml: new Set(['true', 'false', 'null', 'yes', 'no']),
  json: new Set(['true', 'false', 'null']),
};

/**
 * Deterministic, lightweight syntax highlighter supporting all LabPress languages.
 * Returns an array of token arrays (one per line) so line numbering is effortless.
 */
export function tokenizeCodeLines(code: string, language: string): SyntaxToken[][] {
  const lang = (language || 'text').toLowerCase();
  const lines = (code || '').split('\n');
  if (lang === 'text') {
    return lines.map((line) => (line ? [{ kind: 'plain', text: line }] : []));
  }
  return lines.map((line) => tokenizeLine(line, lang));
}

function tokenizeLine(line: string, lang: string): SyntaxToken[] {
  if (!line) return [];
  const tokens: SyntaxToken[] = [];
  const keywords = LANGUAGE_KEYWORDS[lang];

  // Full-line comments for Cisco (!) or # / // / --
  const trimmedStart = line.trimStart();
  if (
    (lang === 'cisco' && trimmedStart.startsWith('!')) ||
    ((lang === 'bash' || lang === 'python' || lang === 'yaml' || lang === 'powershell') &&
      trimmedStart.startsWith('#')) ||
    ((lang === 'cpp' || lang === 'javascript') && trimmedStart.startsWith('//')) ||
    (lang === 'sql' && trimmedStart.startsWith('--'))
  ) {
    return [{ kind: 'comment', text: line }];
  }

  let i = 0;
  let plainBuf = '';
  const flushPlain = () => {
    if (plainBuf) {
      tokens.push({ kind: 'plain', text: plainBuf });
      plainBuf = '';
    }
  };

  while (i < line.length) {
    const ch = line[i];

    // Inline comment
    if (
      (ch === '#' && (lang === 'bash' || lang === 'python' || lang === 'yaml' || lang === 'powershell')) ||
      (ch === '/' && line[i + 1] === '/' && (lang === 'cpp' || lang === 'javascript')) ||
      (ch === '-' && line[i + 1] === '-' && lang === 'sql')
    ) {
      flushPlain();
      tokens.push({ kind: 'comment', text: line.slice(i) });
      break;
    }

    // Strings ("...", '...', `...`)
    if (ch === '"' || ch === "'" || (ch === '`' && lang === 'javascript')) {
      flushPlain();
      const quote = ch;
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\' && j + 1 < line.length) {
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      const strText = line.slice(i, j);
      // Detect JSON object key ("key":)
      if (lang === 'json' && /^\s*:/.test(line.slice(j))) {
        tokens.push({ kind: 'property', text: strText });
      } else {
        tokens.push({ kind: 'string', text: strText });
      }
      i = j;
      continue;
    }

    // YAML key: value
    if (lang === 'yaml' && i === line.length - trimmedStart.length) {
      const yamlKeyMatch = line.slice(i).match(/^([a-zA-Z0-9_.-]+)(\s*:)/);
      if (yamlKeyMatch) {
        flushPlain();
        tokens.push({ kind: 'property', text: yamlKeyMatch[1] });
        tokens.push({ kind: 'plain', text: yamlKeyMatch[2] });
        i += yamlKeyMatch[0].length;
        continue;
      }
    }

    // CLI flags (-v, --verbose, -la, /24)
    if (
      (lang === 'bash' || lang === 'powershell') &&
      ch === '-' &&
      (i === 0 || /\s/.test(line[i - 1])) &&
      /[a-zA-Z-]/.test(line[i + 1] || '')
    ) {
      const flagMatch = line.slice(i).match(/^--?[a-zA-Z0-9_-]+/);
      if (flagMatch) {
        flushPlain();
        tokens.push({ kind: 'flag', text: flagMatch[0] });
        i += flagMatch[0].length;
        continue;
      }
    }

    // Environment variables ($VAR, ${VAR}, $HOME)
    if (
      (lang === 'bash' || lang === 'powershell') &&
      ch === '$' &&
      /[a-zA-Z_{]/.test(line[i + 1] || '')
    ) {
      const envMatch = line.slice(i).match(/^\$(?:\{[a-zA-Z0-9_]+\}|[a-zA-Z0-9_]+)/);
      if (envMatch) {
        flushPlain();
        tokens.push({ kind: 'property', text: envMatch[0] });
        i += envMatch[0].length;
        continue;
      }
    }

    // C++ preprocessor (#include, #define)
    if (lang === 'cpp' && ch === '#') {
      const prepMatch = line.slice(i).match(/^#[a-zA-Z_]+/);
      if (prepMatch) {
        flushPlain();
        tokens.push({ kind: 'keyword', text: prepMatch[0] });
        i += prepMatch[0].length;
        continue;
      }
    }

    // Numbers & IP/CIDR literals
    if (/[0-9]/.test(ch) && (i === 0 || !/[a-zA-Z_]/.test(line[i - 1]))) {
      const numMatch = line.slice(i).match(/^(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)*(?:\/\d+)?)/);
      if (numMatch) {
        flushPlain();
        tokens.push({ kind: 'number', text: numMatch[0] });
        i += numMatch[0].length;
        continue;
      }
    }

    // Identifiers / keywords
    if (/[a-zA-Z_]/.test(ch)) {
      const wordMatch =
        lang === 'powershell' || lang === 'cisco'
          ? line.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_-]*/)
          : line.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      if (wordMatch) {
        const word = wordMatch[0];
        const lookup = lang === 'sql' ? word.toUpperCase() : word;
        if (keywords && keywords.has(lookup)) {
          flushPlain();
          tokens.push({
            kind: lang === 'bash' || lang === 'cisco' ? 'command' : 'keyword',
            text: word,
          });
        } else {
          plainBuf += word;
        }
        i += word.length;
        continue;
      }
    }

    plainBuf += ch;
    i += 1;
  }

  flushPlain();
  return tokens;
}

export const DARK_TOKEN_CLASSES: Record<SyntaxTokenKind, string> = {
  plain: 'text-slate-100',
  comment: 'text-slate-400 italic',
  string: 'text-emerald-300',
  keyword: 'text-sky-300 font-medium',
  command: 'text-sky-300 font-medium',
  number: 'text-amber-300',
  flag: 'text-teal-300',
  property: 'text-indigo-300',
};

export const LIGHT_TOKEN_CLASSES: Record<SyntaxTokenKind, string> = {
  plain: 'text-slate-800',
  comment: 'text-slate-500 italic',
  string: 'text-emerald-700',
  keyword: 'text-blue-700 font-semibold',
  command: 'text-blue-700 font-semibold',
  number: 'text-amber-700',
  flag: 'text-teal-700',
  property: 'text-indigo-700',
};

export function renderHighlightedHtmlLines(
  code: string,
  language: string,
  escapeFn: (s: string) => string
): string[] {
  return tokenizeCodeLines(code, language).map((tokens) =>
    tokens
      .map((tok) =>
        tok.kind === 'plain'
          ? escapeFn(tok.text)
          : `<span class="tok-${tok.kind}">${escapeFn(tok.text)}</span>`
      )
      .join('')
  );
}
