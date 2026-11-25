import JSZip from 'jszip';
import {
  AudienceMode,
  CodePrintTheme,
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
import { renderLatexToHtml } from './math';
import { renderHighlightedHtmlLines } from './syntaxHighlight';
import { isSafeImageSrc } from './imageUtils';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineHtml(text: string, vars: Record<string, string>): string {
  if (!text) return '';
  const pattern =
    /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\$(?!\s)(?:\\\$|[^$\n])+?(?<!\s)\$|\{\{\s*[a-zA-Z0-9_.-]+\s*\}\})/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(resolveVariables(text.slice(lastIndex, match.index), vars, false)).replace(/\n/g, '<br/>');
    }
    const raw = match[0];
    if (raw.startsWith('**') && raw.endsWith('**')) {
      result += `<strong>${escapeHtml(resolveVariables(raw.slice(2, -2), vars, false))}</strong>`;
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      result += `<em>${escapeHtml(resolveVariables(raw.slice(1, -1), vars, false))}</em>`;
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      result += `<code class="inline-code">${escapeHtml(resolveVariables(raw.slice(1, -1), vars, false))}</code>`;
    } else if (raw.startsWith('$') && raw.endsWith('$') && raw.length >= 3) {
      const expr = resolveVariables(raw.slice(1, -1), vars, false);
      const rendered = renderLatexToHtml(expr, false);
      result += `<span class="inline-math">${rendered.html}</span>`;
    } else if (raw.startsWith('{{') && raw.endsWith('}}')) {
      result += escapeHtml(resolveVariables(raw, vars, false));
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    result += escapeHtml(resolveVariables(text.slice(lastIndex), vars, false)).replace(/\n/g, '<br/>');
  }
  return result;
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
      const showNums = block.showLineNumbers !== false;
      const htmlLines = renderHighlightedHtmlLines(resolvedCode, block.language, escapeHtml);
      const linesMarkup = htmlLines
        .map(
          (lineHtml, idx) =>
            `<div class="code-line">${
              showNums ? `<span class="code-ln">${idx + 1}</span>` : ''
            }<span class="code-src">${lineHtml || '&nbsp;'}</span></div>`
        )
        .join('');
      inner = `
        <div class="doc-code-wrap">
          <div class="doc-code-header">
            <span>${escapeHtml(resolveVariables(block.title || 'Code', vars, false))} · ${escapeHtml(block.language)}</span>
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
          </div>
          <pre class="doc-code" data-raw="${escapeHtml(resolvedCode)}"><code>${linesMarkup}</code></pre>
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
    case 'image': {
      const safeSrc = isSafeImageSrc(block.src) ? block.src : '';
      const alignClass =
        block.align === 'left'
          ? 'fig-left'
          : block.align === 'right'
            ? 'fig-right'
            : 'fig-center';
      inner = `
        <figure class="doc-figure ${alignClass}">
          <div class="doc-figure-inner" style="width:${block.width}%">
            ${
              safeSrc
                ? `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(resolveVariables(block.alt || block.caption || 'Figure', vars, false))}" class="${block.bordered ? 'fig-img fig-bordered' : 'fig-img'}" referrerpolicy="no-referrer" />`
                : `<div class="fig-empty">No image attached</div>`
            }
            ${
              block.caption
                ? `<figcaption class="fig-caption">${renderInlineHtml(block.caption, vars)}</figcaption>`
                : ''
            }
          </div>
        </figure>
      `;
      break;
    }
    case 'math': {
      const resolvedLatex = resolveVariables(block.latex, vars, false);
      const rendered = renderLatexToHtml(resolvedLatex, true);
      inner = `
        <div class="doc-math">
          <div class="doc-math-body">${rendered.html}</div>
          ${block.label ? `<span class="doc-math-label">${escapeHtml(block.label)}</span>` : ''}
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
  codePrintTheme?: CodePrintTheme;
  globalVariables: Record<string, string>;
  modules: ReusableModule[];
  audience: AudienceMode;
}): string {
  const { lab, course, layout, pageSetup, codePrintTheme, globalVariables, modules, audience } =
    params;
  const effectiveSetup = pageSetup || resolvePageSetup(layout, lab);
  const effectiveCodePrint: CodePrintTheme = codePrintTheme || layout.codePrintTheme || 'light';
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
          <div class="hdr-grid-main">
            <div class="hdr-meta">${escapeHtml(course?.code || '')} — ${escapeHtml(course?.title || '')}</div>
            <h1>${escapeHtml(lab.labNumber)}: ${escapeHtml(resolvedTitle)}</h1>
            ${resolvedSubtitle ? `<p class="hdr-sub">${escapeHtml(resolvedSubtitle)}</p>` : ''}
          </div>
          <div class="hdr-grid-box">
            <div><strong>Instructor:</strong> ${escapeHtml(layout.professorName)}</div>
            <div><strong>Term:</strong> ${escapeHtml(course?.semester || '')}</div>
            <div><strong>Est. Time:</strong> ${escapeHtml(lab.estimatedTime)}</div>
            ${totalPoints > 0 ? `<div><strong>Total Points:</strong> ${totalPoints} pts</div>` : ''}
            <div><strong>Edition:</strong> ${editionLabel}</div>
          </div>
        </div>
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

  const effectiveBlockSpacing =
    layout.blockSpacing || (layout.density === 'compact' ? 'tight' : 'normal');
  const spacing =
    effectiveBlockSpacing === 'tight'
      ? '12px'
      : effectiveBlockSpacing === 'relaxed'
        ? '30px'
        : '20px';
  const effectiveHeaderSpacing = layout.headerSpacing || 'normal';
  const hdrBottomMargin =
    effectiveHeaderSpacing === 'tight'
      ? '18px'
      : effectiveHeaderSpacing === 'relaxed'
        ? '36px'
        : '26px';
  const hdrBannerPad =
    effectiveHeaderSpacing === 'tight'
      ? '14px 18px'
      : effectiveHeaderSpacing === 'relaxed'
        ? '24px 28px'
        : '18px 22px';
  const hdrRulePadBottom =
    effectiveHeaderSpacing === 'tight'
      ? '12px'
      : effectiveHeaderSpacing === 'relaxed'
        ? '24px'
        : '18px';
  const hdrGridGap =
    effectiveHeaderSpacing === 'tight'
      ? '14px'
      : effectiveHeaderSpacing === 'relaxed'
        ? '32px'
        : '22px';
  const hdrSubTop =
    effectiveHeaderSpacing === 'tight'
      ? '4px'
      : effectiveHeaderSpacing === 'relaxed'
        ? '12px'
        : '8px';

  const printCodeCss =
    effectiveCodePrint === 'light'
      ? `
      .doc-code { background: #f8fafc !important; color: #0f172a !important; }
      .code-ln { color: #64748b !important; border-right-color: #cbd5e1 !important; }
      .tok-comment { color: #64748b !important; }
      .tok-string { color: #047857 !important; }
      .tok-keyword, .tok-command { color: #1d4ed8 !important; font-weight: 600; }
      .tok-number { color: #b45309 !important; }
      .tok-flag { color: #0f766e !important; }
      .tok-property { color: #4338ca !important; }
      `
      : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(lab.labNumber)} — ${escapeHtml(resolvedTitle)} (${editionLabel})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
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
    h1 { margin: 0; font-size: 26px; line-height: 1.25; color: #0f172a; overflow-wrap: break-word; }
    .hdr-sub { margin: ${hdrSubTop} 0 0; color: #475569; font-size: 14px; overflow-wrap: break-word; }
    .hdr-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-top: 3px solid var(--accent);
      padding: ${hdrBannerPad};
      margin-bottom: ${hdrBottomMargin};
    }
    .hdr-editorial {
      padding-bottom: ${hdrRulePadBottom};
      border-bottom: 2px solid var(--accent);
      margin-bottom: ${hdrBottomMargin};
    }
    .hdr-grid {
      padding-bottom: ${hdrRulePadBottom};
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: ${hdrBottomMargin};
    }
    .hdr-grid-top { display: flex; justify-content: space-between; gap: ${hdrGridGap}; align-items: flex-start; }
    .hdr-grid-main { flex: 1; min-width: 0; }
    .hdr-grid-box {
      font-size: 12px;
      color: #334155;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      min-width: 210px;
      line-height: 1.7;
    }
    .doc-h1 { font-size: 22px; margin: 24px 0 10px; color: #0f172a; break-after: avoid; }
    .doc-h2 { font-size: 18px; margin: 24px 0 10px; color: #0f172a; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; break-after: avoid; }
    .doc-h3 { font-size: 15px; margin: 18px 0 8px; color: #1e293b; break-after: avoid; }
    .doc-p { margin: 0 0 ${spacing}; color: #1e293b; }
    .inline-code { font-family: 'JetBrains Mono', monospace; font-size: 0.88em; background: #f1f5f9; padding: 2px 5px; border-radius: 3px; color: #0f172a; }
    .inline-math { display: inline-block; }
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
    .step-content { flex: 1; min-width: 0; }
    .step-header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
    .step-meta { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #64748b; }
    .step-body { margin: 0; color: #334155; }
    .step-checkpoint { margin-top: 6px; font-size: 13px; color: #0f766e; background: #f0fdfa; border: 1px solid #ccfbf1; padding: 6px 10px; border-radius: 4px; }
    .doc-code-wrap { margin: 0 0 ${spacing}; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; break-inside: avoid; }
    .doc-code-header { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 7px 12px; font-size: 12px; color: #475569; font-family: 'JetBrains Mono', monospace; }
    .copy-btn { background: #ffffff; border: 1px solid #cbd5e1; color: #334155; font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer; }
    .doc-code { margin: 0; padding: 12px 14px; background: #0f172a; color: #f8fafc; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; overflow-x: auto; line-height: 1.55; }
    .code-line { display: flex; }
    .code-ln { user-select: none; min-width: 2.25em; padding-right: 12px; margin-right: 12px; text-align: right; color: #64748b; border-right: 1px solid #1e293b; font-variant-numeric: tabular-nums; }
    .code-src { white-space: pre; flex: 1; }
    .tok-comment { color: #94a3b8; font-style: italic; }
    .tok-string { color: #6ee7b7; }
    .tok-keyword, .tok-command { color: #7dd3fc; font-weight: 500; }
    .tok-number { color: #fcd34d; }
    .tok-flag { color: #5eead4; }
    .tok-property { color: #a5b4fc; }
    .doc-output { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 10px 14px; }
    .doc-output-label { font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
    .doc-output pre { margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #334155; white-space: pre-wrap; }
    .doc-callout { margin: 0 0 ${spacing}; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; break-inside: avoid; }
    .callout-caution { background: #fffbeb; border-color: #fde68a; }
    .callout-tip { background: #f0fdfa; border-color: #99f6e4; }
    .callout-prereq { background: #eff6ff; border-color: #bfdbfe; }
    .callout-title { font-weight: 600; font-size: 13px; margin-bottom: 4px; color: #0f172a; }
    .callout-body { font-size: 14px; color: #334155; }
    .doc-table-wrap { margin: 0 0 ${spacing}; }
    .doc-table-wrap figcaption { font-weight: 600; font-size: 13px; color: #334155; margin-bottom: 8px; break-after: avoid; }
    .doc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .doc-table thead { display: table-header-group; }
    .doc-table tr { break-inside: avoid; }
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
    .doc-figure { margin: 0 0 ${spacing}; display: flex; break-inside: avoid; }
    .fig-left { justify-content: flex-start; }
    .fig-center { justify-content: center; }
    .fig-right { justify-content: flex-end; }
    .doc-figure-inner { max-width: 100%; }
    .fig-img { display: block; width: 100%; height: auto; border-radius: 4px; }
    .fig-bordered { border: 1px solid #cbd5e1; padding: 6px; background: #ffffff; }
    .fig-empty { border: 1px dashed #cbd5e1; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; border-radius: 4px; }
    .fig-caption { margin-top: 8px; font-size: 12.5px; color: #475569; text-align: center; }
    .doc-math { margin: 0 0 ${spacing}; padding: 10px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; gap: 16px; break-inside: avoid; overflow-x: auto; }
    .doc-math-body { flex: 1; text-align: center; }
    .doc-math-label { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #64748b; flex-shrink: 0; }
    .instructor-block { border: 1px dashed #d97706; background: #fffbeb; padding: 12px 14px; border-radius: 6px; margin: 0 0 ${spacing}; break-inside: avoid; }
    .instructor-tag { font-size: 11px; font-weight: 600; color: #92400e; margin-bottom: 6px; }
    .page-break { page-break-after: always; break-after: page; height: 1px; }
    .doc-footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }
    @media print {
      @page {
        size: ${geom.cssAtPageSize};
        margin: ${effectiveSetup.margins.top}in ${effectiveSetup.margins.right}in ${effectiveSetup.margins.bottom}in ${effectiveSetup.margins.left}in;
      }
      body { background: #ffffff; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet { box-shadow: none; border: none; padding: 0; max-width: none; min-height: auto; }
      .copy-btn { display: none; }
      ${printCodeCss}
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
      var raw = pre.getAttribute('data-raw') || pre.innerText;
      navigator.clipboard.writeText(raw).then(function() {
        btn.innerText = 'Copied';
        setTimeout(function() { btn.innerText = 'Copy'; }, 1500);
      });
    }
  </script>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*                              Markdown Export                               */
/* -------------------------------------------------------------------------- */

function renderBlockMarkdown(
  block: LabBlock,
  audience: AudienceMode,
  vars: Record<string, string>,
  modules: ReusableModule[]
): string {
  if (audience === 'student' && block.audience === 'instructor') {
    return '';
  }

  const r = (t: string) => resolveVariables(t || '', vars, false);
  const wrapInstructor = (md: string) =>
    block.audience === 'instructor'
      ? `> **[Instructor Note]**\n>\n${md
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n')}`
      : md;

  let out = '';
  switch (block.type) {
    case 'heading': {
      const hashes = '#'.repeat(Math.min(6, Math.max(1, block.level + 1)));
      out = `${hashes} ${r(block.text)}`;
      break;
    }
    case 'paragraph': {
      out = r(block.text);
      break;
    }
    case 'steps': {
      const lines: string[] = [];
      if (block.title) lines.push(`### ${r(block.title)}`, '');
      block.items.forEach((item, idx) => {
        const num = block.startNumber + idx;
        const mins = item.minutes ? ` *(${r(item.minutes)})*` : '';
        lines.push(`${num}. **${r(item.title)}**${mins}`);
        if (item.body) lines.push(`   ${r(item.body).replace(/\n/g, '\n   ')}`);
        if (item.checkpoint) lines.push(`   > **Checkpoint:** ${r(item.checkpoint)}`);
      });
      out = lines.join('\n');
      break;
    }
    case 'code': {
      const parts: string[] = [];
      if (block.title) parts.push(`**${r(block.title)}**`);
      parts.push(`\`\`\`${block.language || ''}\n${r(block.code)}\n\`\`\``);
      if (block.expectedOutput.trim()) {
        parts.push(`*Expected Output:*\n\`\`\`text\n${r(block.expectedOutput)}\n\`\`\``);
      }
      out = parts.join('\n\n');
      break;
    }
    case 'callout': {
      const labelMap: Record<string, string> = {
        info: 'NOTE',
        tip: 'TIP',
        caution: 'CAUTION',
        prereq: 'PREREQUISITE',
      };
      const tag = labelMap[block.variant] || 'NOTE';
      const bodyLines = r(block.body)
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n');
      out = `> **${tag} — ${r(block.title)}**\n>\n${bodyLines}`;
      break;
    }
    case 'table': {
      const escapeCell = (s: string) => r(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const headerRow = `| ${block.headers.map(escapeCell).join(' | ')} |`;
      const sepRow = `| ${block.headers.map(() => '---').join(' | ')} |`;
      const bodyRows = block.rows
        .map((row) => `| ${row.map(escapeCell).join(' | ')} |`)
        .join('\n');
      out = [block.caption ? `**${r(block.caption)}**` : '', headerRow, sepRow, bodyRows]
        .filter(Boolean)
        .join('\n');
      break;
    }
    case 'response': {
      const lines: string[] = [`**Question (${block.points} pts):** ${r(block.prompt)}`];
      if (audience === 'instructor') {
        lines.push('', `> **Instructor Answer Key:** ${r(block.instructorSolution)}`);
      } else {
        lines.push('', ...Array.from({ length: Math.max(2, block.answerLines) }).map(() => '________________________________________________________________________'), '');
      }
      out = lines.join('\n');
      break;
    }
    case 'checklist': {
      const lines: string[] = [];
      if (block.title) lines.push(`**${r(block.title)}**`, '');
      block.items.forEach((it) => {
        lines.push(`- [ ] ${r(it.text)}`);
      });
      out = lines.join('\n');
      break;
    }
    case 'image': {
      const caption = r(block.caption);
      const alt = r(block.alt || caption || 'Figure');
      if (block.src && !block.src.startsWith('data:')) {
        out = `![${alt}](${block.src})${caption ? `\n*${caption}*` : ''}`;
      } else if (block.src) {
        out = `![${alt}](${block.src})${caption ? `\n*${caption}*` : ''}`;
      } else {
        out = `*[Figure placeholder: ${caption || alt}]*`;
      }
      break;
    }
    case 'math': {
      const expr = r(block.latex);
      const labelSuffix = block.label ? ` \\tag{${block.label.replace(/[()]/g, '')}}` : '';
      out = `$$\n${expr}${labelSuffix}\n$$`;
      break;
    }
    case 'moduleRef': {
      const mod = modules.find((m) => m.id === block.moduleId);
      if (!mod) return '';
      out = mod.blocks
        .map((mb) => renderBlockMarkdown(mb, audience, vars, modules))
        .filter(Boolean)
        .join('\n\n');
      break;
    }
    case 'pageBreak': {
      out = '---';
      break;
    }
  }

  return wrapInstructor(out);
}

export function generateMarkdown(params: {
  lab: LabDocument;
  course?: Course;
  layout: LayoutProfile;
  globalVariables: Record<string, string>;
  modules: ReusableModule[];
  audience: AudienceMode;
}): string {
  const { lab, course, layout, globalVariables, modules, audience } = params;
  const vars = buildVariableMap(globalVariables, course, lab);
  const editionLabel = audience === 'instructor' ? 'Instructor Key' : 'Student Handout';
  const totalPoints = lab.blocks.reduce(
    (sum, b) => (b.type === 'response' ? sum + (b.points || 0) : sum),
    0
  );

  const meta = [
    course?.code,
    course?.semester,
    layout.professorName,
    lab.estimatedTime,
    totalPoints > 0 ? `${totalPoints} pts` : '',
    editionLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  const title = resolveVariables(lab.title, vars, false);
  const subtitle = resolveVariables(lab.subtitle, vars, false);
  const footer = resolveVariables(layout.footerTemplate, vars, false);

  const sections: string[] = [
    `# ${lab.labNumber}: ${title}`,
    `*${meta}*`,
    subtitle ? `> ${subtitle}` : '',
    ...lab.blocks.map((b) => renderBlockMarkdown(b, audience, vars, modules)),
    '---',
    `*${footer} — ${editionLabel}*`,
  ].filter(Boolean);

  return `${sections.join('\n\n')}\n`;
}

/* -------------------------------------------------------------------------- */
/*                         Course Packet ZIP Batch Export                     */
/* -------------------------------------------------------------------------- */

export async function exportCoursePacketZip(params: {
  course: Course;
  labs: LabDocument[];
  layoutProfiles: LayoutProfile[];
  globalVariables: Record<string, string>;
  modules: ReusableModule[];
  editions: 'student' | 'instructor' | 'both';
  formats: { html: boolean; markdown: boolean };
  codePrintTheme?: CodePrintTheme;
}): Promise<{ filename: string; fileCount: number }> {
  const {
    course,
    labs,
    layoutProfiles,
    globalVariables,
    modules,
    editions,
    formats,
    codePrintTheme,
  } = params;

  const zip = new JSZip();
  const editionList: AudienceMode[] =
    editions === 'both' ? ['student', 'instructor'] : [editions];

  let fileCount = 0;

  for (const lab of labs) {
    const targetLayoutId =
      lab.layoutOverrideId || course.defaultLayoutId || lab.layoutProfileId;
    const layout =
      layoutProfiles.find((p) => p.id === targetLayoutId) || layoutProfiles[0];
    if (!layout) continue;

    const pageSetup = resolvePageSetup(layout, lab);

    for (const edition of editionList) {
      const folder = editions === 'both' ? `${edition}/` : '';
      const baseName = slugifyFilename([course.code, lab.labNumber, lab.title, edition]);

      if (formats.html) {
        const html = generateStandaloneHtml({
          lab,
          course,
          layout,
          pageSetup,
          codePrintTheme,
          globalVariables,
          modules,
          audience: edition,
        });
        zip.file(`${folder}${baseName}.html`, html);
        fileCount += 1;
      }

      if (formats.markdown) {
        const md = generateMarkdown({
          lab,
          course,
          layout,
          globalVariables,
          modules,
          audience: edition,
        });
        zip.file(`${folder}${baseName}.md`, md);
        fileCount += 1;
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `${slugifyFilename([course.code, course.semester, 'packet'])}.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filename, fileCount };
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

export function suggestNextSemester(current: string): string {
  const trimmed = (current || '').trim();
  const match = trimmed.match(/^(Fall|Spring|Summer|Winter)\s+(\d{4})$/i);
  if (!match) {
    const year = new Date().getFullYear();
    return `Spring ${year + 1}`;
  }
  const season = match[1].toLowerCase();
  const year = parseInt(match[2], 10);
  if (season === 'fall') return `Spring ${year + 1}`;
  if (season === 'winter') return `Spring ${year}`;
  if (season === 'spring') return `Fall ${year}`;
  return `Fall ${year}`;
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
