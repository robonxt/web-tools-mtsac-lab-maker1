import {
  AudienceMode,
  Course,
  LabBlock,
  LabDocument,
  LayoutProfile,
  PageSetup,
  ReusableModule,
  WorkspaceState,
} from '../types/lab';
import { buildVariableMap, resolveVariables } from './variables';
import { computePageGeometry, resolvePageSetup } from './pageGeometry';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineHtml(text: string, vars: Record<string, string>): string {
  const resolved = resolveVariables(text, vars, false);
  const escaped = escapeHtml(resolved);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\n/g, '<br/>');
}

function renderBlockHtml(
  block: LabBlock,
  audience: AudienceMode,
  vars: Record<string, string>,
  layout: LayoutProfile,
  modules: ReusableModule[]
): string {
  if (audience === 'student' && block.audience === 'instructor') {
    return '';
  }

  const instructorWrapStart =
    block.audience === 'instructor'
      ? `<div class="instructor-block"><div class="instructor-tag">Instructor Note</div>`
      : '';
  const instructorWrapEnd = block.audience === 'instructor' ? `</div>` : '';

  let inner = '';

  switch (block.type) {
    case 'heading': {
      const tag = `h${block.level}`;
      inner = `<${tag} class="doc-h${block.level}">${renderInlineHtml(block.text, vars)}</${tag}>`;
      break;
    }
    case 'paragraph': {
      inner = `<p class="doc-p">${renderInlineHtml(block.text, vars)}</p>`;
      break;
    }
    case 'steps': {
      const itemsHtml = block.items
        .map((item, idx) => {
          const num = block.startNumber + idx;
          const badge =
            layout.stepStyle === 'stepped'
              ? `Step ${String(num).padStart(2, '0')}`
              : layout.stepStyle === 'minimal'
                ? `${num}.`
                : `${num}`;
          return `
            <li class="step-item">
              <div class="step-marker">${escapeHtml(badge)}</div>
              <div class="step-content">
                <div class="step-header">
                  <strong>${renderInlineHtml(item.title, vars)}</strong>
                  ${item.minutes ? `<span class="step-meta">${escapeHtml(item.minutes)}</span>` : ''}
                </div>
                <p class="step-body">${renderInlineHtml(item.body, vars)}</p>
                ${
                  item.checkpoint
                    ? `<div class="step-checkpoint"><strong>Checkpoint:</strong> ${renderInlineHtml(item.checkpoint, vars)}</div>`
                    : ''
                }
              </div>
            </li>
          `;
        })
        .join('');
      inner = `
        <section class="doc-steps">
          ${block.title ? `<h3 class="doc-h3">${renderInlineHtml(block.title, vars)}</h3>` : ''}
          <ol class="steps-list">${itemsHtml}</ol>
        </section>
      `;
      break;
    }
    case 'code': {
      const resolvedCode = resolveVariables(block.code, vars, false);
      const resolvedOut = resolveVariables(block.expectedOutput, vars, false);
      inner = `
        <div class="doc-code-wrap">
          <div class="doc-code-header">
            <span>${escapeHtml(resolveVariables(block.title || 'Code', vars, false))} · ${escapeHtml(block.language)}</span>
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
          </div>
          <pre class="doc-code"><code>${escapeHtml(resolvedCode)}</code></pre>
          ${
            resolvedOut.trim()
              ? `<div class="doc-output"><div class="doc-output-label">Expected Output</div><pre>${escapeHtml(resolvedOut)}</pre></div>`
              : ''
          }
        </div>
      `;
      break;
    }
    case 'callout': {
      const labelMap: Record<string, string> = {
        info: 'Note',
        tip: 'Tip',
        caution: 'Caution',
        prereq: 'Prerequisite',
      };
      inner = `
        <div class="doc-callout callout-${block.variant}">
          <div class="callout-title">${escapeHtml(labelMap[block.variant] || 'Note')} · ${renderInlineHtml(block.title, vars)}</div>
          <div class="callout-body">${renderInlineHtml(block.body, vars)}</div>
        </div>
      `;
      break;
    }
    case 'table': {
      const thead = block.headers
        .map((h) => `<th>${renderInlineHtml(h, vars)}</th>`)
        .join('');
      const tbody = block.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${renderInlineHtml(cell, vars)}</td>`).join('')}</tr>`
        )
        .join('');
      inner = `
        <figure class="doc-table-wrap">
          ${block.caption ? `<figcaption>${renderInlineHtml(block.caption, vars)}</figcaption>` : ''}
          <table class="doc-table">
            <thead><tr>${thead}</tr></thead>
            <tbody>${tbody}</tbody>
          </table>
        </figure>
      `;
      break;
    }
    case 'response': {
      const blankLines = Array.from({ length: Math.max(2, block.answerLines) })
        .map(() => `<div class="answer-line"></div>`)
        .join('');
      inner = `
        <div class="doc-response">
          <div class="response-header">
            <span class="response-prompt">${renderInlineHtml(block.prompt, vars)}</span>
            <span class="response-pts">${block.points} pts</span>
          </div>
          ${
            audience === 'instructor'
              ? `<div class="response-solution"><div class="solution-label">Instructor Answer Key</div><div>${renderInlineHtml(block.instructorSolution, vars)}</div></div>`
              : `<div class="response-lines">${blankLines}</div>`
          }
        </div>
      `;
      break;
    }
    case 'checklist': {
      const items = block.items
        .map(
          (item) =>
            `<li class="check-item"><span class="check-box"></span><span>${renderInlineHtml(item.text, vars)}</span></li>`
        )
        .join('');
      inner = `
        <div class="doc-checklist">
          ${block.title ? `<div class="checklist-title">${renderInlineHtml(block.title, vars)}</div>` : ''}
          <ul>${items}</ul>
        </div>
      `;
      break;
    }
    case 'moduleRef': {
      const mod = modules.find((m) => m.id === block.moduleId);
      if (!mod) return '';
      inner = mod.blocks
        .map((mb) => renderBlockHtml(mb, audience, vars, layout, modules))
        .join('');
      break;
    }
    case 'pageBreak': {
      inner = `<div class="page-break"></div>`;
      break;
    }
  }

  return `${instructorWrapStart}${inner}${instructorWrapEnd}`;
}

export function generateStandaloneHtml(params: {
  lab: LabDocument;
  course?: Course;
  layout: LayoutProfile;
  pageSetup?: PageSetup;
  globalVariables: Record<string, string>;
  modules: ReusableModule[];
  audience: AudienceMode;
}): string {
  const { lab, course, layout, pageSetup, globalVariables, modules, audience } = params;
  const effectiveSetup = pageSetup || resolvePageSetup(layout, lab);
  const geom = computePageGeometry(effectiveSetup);
  const vars = buildVariableMap(globalVariables, course, lab);
  const bodyFont =
    layout.fontFamily === 'serif'
      ? `'Source Serif 4', Georgia, serif`
      : `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif`;

  const resolvedTitle = resolveVariables(lab.title, vars, false);
  const resolvedSubtitle = resolveVariables(lab.subtitle, vars, false);
  const resolvedFooter = resolveVariables(layout.footerTemplate, vars, false);
  const totalPoints = lab.blocks.reduce(
    (sum, b) => (b.type === 'response' ? sum + (b.points || 0) : sum),
    0
  );
  const pointsSuffix = totalPoints > 0 ? ` · ${totalPoints} pts` : '';

  const editionLabel = audience === 'instructor' ? 'Instructor Key' : 'Student Handout';

  let headerHtml = '';
  if (layout.headerVariant === 'banner') {
    headerHtml = `
      <header class="hdr-banner">
        <div class="hdr-meta">${escapeHtml(course?.code || 'Course')} · ${escapeHtml(course?.semester || '')} · ${escapeHtml(layout.professorName)}${pointsSuffix} · ${editionLabel}</div>
        <h1>${escapeHtml(lab.labNumber)}: ${escapeHtml(resolvedTitle)}</h1>
        ${resolvedSubtitle ? `<p class="hdr-sub">${escapeHtml(resolvedSubtitle)}</p>` : ''}
      </header>
    `;
  } else if (layout.headerVariant === 'grid') {
    headerHtml = `
      <header class="hdr-grid">
        <div class="hdr-grid-top">
          <div>
            <div class="hdr-meta">${escapeHtml(course?.code || '')} — ${escapeHtml(course?.title || '')}</div>
            <h1>${escapeHtml(lab.labNumber)}: ${escapeHtml(resolvedTitle)}</h1>
          </div>
          <div class="hdr-grid-box">
            <div><strong>Instructor:</strong> ${escapeHtml(layout.professorName)}</div>
            <div><strong>Term:</strong> ${escapeHtml(course?.semester || '')}</div>
            <div><strong>Est. Time:</strong> ${escapeHtml(lab.estimatedTime)}</div>
            ${totalPoints > 0 ? `<div><strong>Total Points:</strong> ${totalPoints} pts</div>` : ''}
            <div><strong>Edition:</strong> ${editionLabel}</div>
          </div>
        </div>
        ${resolvedSubtitle ? `<p class="hdr-sub">${escapeHtml(resolvedSubtitle)}</p>` : ''}
      </header>
    `;
  } else {
    headerHtml = `
      <header class="hdr-editorial">
        <div class="hdr-meta">${escapeHtml(course?.code || '')} · ${escapeHtml(course?.semester || '')} · ${escapeHtml(layout.professorName)} · ${escapeHtml(lab.estimatedTime)}${pointsSuffix} · ${editionLabel}</div>
        <h1>${escapeHtml(lab.labNumber)}: ${escapeHtml(resolvedTitle)}</h1>
        ${resolvedSubtitle ? `<p class="hdr-sub">${escapeHtml(resolvedSubtitle)}</p>` : ''}
      </header>
    `;
  }

  const blocksHtml = lab.blocks
    .map((b) => renderBlockHtml(b, audience, vars, layout, modules))
    .join('\n');

  const spacing = layout.density === 'compact' ? '14px' : '20px';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(lab.labNumber)} — ${escapeHtml(resolvedTitle)} (${editionLabel})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --accent: ${layout.accentColor}; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 36px 20px;
      background: #f1f5f9;
      color: #0f172a;
      font-family: ${bodyFont};
      font-size: ${layout.density === 'compact' ? '14px' : '15px'};
      line-height: 1.6;
    }
    .sheet {
      max-width: ${geom.widthPx}px;
      min-height: ${geom.heightPx}px;
      margin: 0 auto;
      background: #ffffff;
      padding: ${geom.marginTopPx}px ${geom.marginRightPx}px ${geom.marginBottomPx}px ${geom.marginLeftPx}px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
    }
    .hdr-meta { font-size: 12px; color: #475569; margin-bottom: 8px; }
    h1 { margin: 0; font-size: 26px; line-height: 1.25; color: #0f172a; }
    .hdr-sub { margin: 8px 0 0; color: #475569; font-size: 14px; }
    .hdr-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-top: 3px solid var(--accent);
      padding: 20px 24px;
      margin-bottom: 28px;
    }
    .hdr-editorial {
      padding-bottom: 18px;
      border-bottom: 2px solid var(--accent);
      margin-bottom: 28px;
    }
    .hdr-grid {
      padding-bottom: 18px;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 28px;
    }
    .hdr-grid-top { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
    .hdr-grid-box {
      font-size: 12px;
      color: #334155;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      min-width: 210px;
      line-height: 1.7;
    }
    .doc-h1 { font-size: 22px; margin: 24px 0 10px; color: #0f172a; }
    .doc-h2 { font-size: 18px; margin: 24px 0 10px; color: #0f172a; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
    .doc-h3 { font-size: 15px; margin: 18px 0 8px; color: #1e293b; }
    .doc-p { margin: 0 0 ${spacing}; color: #1e293b; }
    .inline-code { font-family: 'JetBrains Mono', monospace; font-size: 0.88em; background: #f1f5f9; padding: 2px 5px; border-radius: 3px; color: #0f172a; }
    .doc-steps { margin: 0 0 ${spacing}; }
    .steps-list { list-style: none; padding: 0; margin: 12px 0 0; }
    .step-item { display: flex; gap: 14px; margin-bottom: 14px; break-inside: avoid; }
    .step-marker {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      min-width: ${layout.stepStyle === 'stepped' ? '64px' : '28px'};
      padding-top: 2px;
    }
    .step-content { flex: 1; }
    .step-header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
    .step-meta { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #64748b; }
    .step-body { margin: 0; color: #334155; }
    .step-checkpoint { margin-top: 6px; font-size: 13px; color: #0f766e; background: #f0fdfa; border: 1px solid #ccfbf1; padding: 6px 10px; border-radius: 4px; }
    .doc-code-wrap { margin: 0 0 ${spacing}; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; break-inside: avoid; }
    .doc-code-header { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 7px 12px; font-size: 12px; color: #475569; font-family: 'JetBrains Mono', monospace; }
    .copy-btn { background: #ffffff; border: 1px solid #cbd5e1; color: #334155; font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer; }
    .doc-code { margin: 0; padding: 14px; background: #0f172a; color: #f8fafc; font-family: 'JetBrains Mono', monospace; font-size: 13px; overflow-x: auto; line-height: 1.55; }
    .doc-output { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 10px 14px; }
    .doc-output-label { font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
    .doc-output pre { margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #334155; white-space: pre-wrap; }
    .doc-callout { margin: 0 0 ${spacing}; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; break-inside: avoid; }
    .callout-caution { background: #fffbeb; border-color: #fde68a; }
    .callout-tip { background: #f0fdfa; border-color: #99f6e4; }
    .callout-prereq { background: #eff6ff; border-color: #bfdbfe; }
    .callout-title { font-weight: 600; font-size: 13px; margin-bottom: 4px; color: #0f172a; }
    .callout-body { font-size: 14px; color: #334155; }
    .doc-table-wrap { margin: 0 0 ${spacing}; break-inside: avoid; }
    .doc-table-wrap figcaption { font-weight: 600; font-size: 13px; color: #334155; margin-bottom: 8px; }
    .doc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .doc-table th, .doc-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    .doc-table th { background: #f8fafc; font-weight: 600; color: #0f172a; }
    .doc-response { margin: 0 0 ${spacing}; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px 16px; break-inside: avoid; }
    .response-header { display: flex; justify-content: space-between; gap: 16px; font-weight: 600; margin-bottom: 10px; }
    .response-pts { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--accent); white-space: nowrap; }
    .answer-line { height: 28px; border-bottom: 1px solid #cbd5e1; }
    .response-solution { background: #fffbeb; border: 1px solid #fde68a; padding: 10px 12px; border-radius: 4px; font-size: 13px; }
    .solution-label { font-weight: 600; color: #92400e; margin-bottom: 4px; }
    .doc-checklist { margin: 0 0 ${spacing}; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; break-inside: avoid; }
    .checklist-title { font-weight: 600; font-size: 14px; margin-bottom: 8px; }
    .doc-checklist ul { list-style: none; padding: 0; margin: 0; }
    .check-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
    .check-box { width: 14px; height: 14px; border: 1.5px solid #64748b; border-radius: 2px; margin-top: 4px; flex-shrink: 0; }
    .instructor-block { border: 1px dashed #d97706; background: #fffbeb; padding: 12px 14px; border-radius: 6px; margin: 0 0 ${spacing}; break-inside: avoid; }
    .instructor-tag { font-size: 11px; font-weight: 600; color: #92400e; margin-bottom: 6px; }
    .page-break { page-break-after: always; break-after: page; height: 1px; }
    .doc-footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }
    @media print {
      @page {
        size: ${geom.cssAtPageSize};
        margin: ${effectiveSetup.margins.top}in ${effectiveSetup.margins.right}in ${effectiveSetup.margins.bottom}in ${effectiveSetup.margins.left}in;
      }
      body { background: #ffffff; padding: 0; }
      .sheet { box-shadow: none; border: none; padding: 0; max-width: none; min-height: auto; }
      .copy-btn { display: none; }
    }
  </style>
</head>
<body>
  <article class="sheet">
    ${headerHtml}
    ${blocksHtml}
    <footer class="doc-footer">
      <span>${escapeHtml(resolvedFooter)}</span>
      <span>${escapeHtml(editionLabel)}</span>
    </footer>
  </article>
  <script>
    function copyCode(btn) {
      var pre = btn.parentElement.nextElementSibling;
      if (!pre) return;
      navigator.clipboard.writeText(pre.innerText).then(function() {
        btn.innerText = 'Copied';
        setTimeout(function() { btn.innerText = 'Copy'; }, 1500);
      });
    }
  </script>
</body>
</html>`;
}

export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function slugifyFilename(parts: string[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function exportWorkspaceJson(state: WorkspaceState): void {
  const filename = `labpress-workspace-${new Date().toISOString().slice(0, 10)}.json`;
  triggerFileDownload(filename, JSON.stringify(state, null, 2), 'application/json');
}
