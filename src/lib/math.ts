import katex from 'katex';

export interface LatexRenderResult {
  html: string;
  error?: string;
}

/**
 * Safely renders a LaTeX expression to KaTeX HTML with trust disabled
 * so no unsafe HTML/scripts can be injected via math commands.
 */
export function renderLatexToHtml(
  latex: string,
  displayMode = false
): LatexRenderResult {
  const trimmed = (latex || '').trim();
  if (!trimmed) {
    return { html: '' };
  }
  try {
    const html = katex.renderToString(trimmed, {
      displayMode,
      throwOnError: true,
      strict: false,
      trust: false,
      output: 'html',
    });
    return { html };
  } catch (err) {
    const fallback = katex.renderToString(trimmed, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      errorColor: '#b91c1c',
      output: 'html',
    });
    const message =
      err instanceof Error ? err.message.replace(/^KaTeX parse error:\s*/i, '') : 'Invalid LaTeX syntax';
    return { html: fallback, error: message };
  }
}
