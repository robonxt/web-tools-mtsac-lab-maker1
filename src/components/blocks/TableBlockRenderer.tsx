import React from 'react';
import { Trash2 } from 'lucide-react';
import { BlockSlice, TableBlock } from '../../types/lab';
import { InlineRichText } from '../InlineRichText';
import { AutoGrowTextarea } from '../AutoGrowTextarea';

interface TableBlockRendererProps {
  block: TableBlock;
  editing: boolean;
  variables: Record<string, string>;
  showRawTokens: boolean;
  slice?: BlockSlice;
  onChange?: (updated: TableBlock) => void;
}

export const TableBlockRenderer: React.FC<TableBlockRendererProps> = ({
  block,
  editing,
  variables,
  showRawTokens,
  slice,
  onChange,
}) => {
  if (editing && onChange) {
    const updateHeader = (colIdx: number, val: string) => {
      const headers = [...block.headers];
      headers[colIdx] = val;
      onChange({ ...block, headers });
    };
    const updateCell = (rowIdx: number, colIdx: number, val: string) => {
      const rows = block.rows.map((r, rI) =>
        rI === rowIdx ? r.map((c, cI) => (cI === colIdx ? val : c)) : r
      );
      onChange({ ...block, rows });
    };
    const addRow = () => {
      onChange({
        ...block,
        rows: [...block.rows, block.headers.map(() => '')],
      });
    };
    const removeRow = (rowIdx: number) => {
      if (block.rows.length <= 1) return;
      onChange({ ...block, rows: block.rows.filter((_, idx) => idx !== rowIdx) });
    };
    const addColumn = () => {
      onChange({
        ...block,
        headers: [...block.headers, `Column ${block.headers.length + 1}`],
        rows: block.rows.map((r) => [...r, '']),
      });
    };
    const removeColumn = (colIdx: number) => {
      if (block.headers.length <= 2) return;
      onChange({
        ...block,
        headers: block.headers.filter((_, idx) => idx !== colIdx),
        rows: block.rows.map((r) => r.filter((_, idx) => idx !== colIdx)),
      });
    };

    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <AutoGrowTextarea
            value={block.caption}
            onChange={(val) => onChange({ ...block, caption: val })}
            placeholder="Table caption..."
            ariaLabel="Table caption"
            singleLineWrap
            className="flex-1 min-w-0 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:bg-white focus:border-blue-600"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={addRow}
              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer"
            >
              + Row
            </button>
            <button
              type="button"
              onClick={addColumn}
              className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
            >
              + Column
            </button>
          </div>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50">
                {block.headers.map((h, cIdx) => (
                  <th
                    key={cIdx}
                    className="border-b border-r border-slate-200 p-1.5 text-left align-top"
                  >
                    <div className="flex items-start gap-1">
                      <AutoGrowTextarea
                        value={h}
                        onChange={(val) => updateHeader(cIdx, val)}
                        ariaLabel={`Column ${cIdx + 1} header`}
                        singleLineWrap
                        className="w-full font-semibold text-slate-900 bg-transparent focus:outline-none leading-snug"
                      />
                      {block.headers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(cIdx)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                          title="Remove column"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-8 border-b border-slate-200" />
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-slate-200 last:border-b-0">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="border-r border-slate-200 p-1.5 align-top">
                      <AutoGrowTextarea
                        value={cell}
                        onChange={(val) => updateCell(rIdx, cIdx, val)}
                        ariaLabel={`Row ${rIdx + 1} column ${cIdx + 1}`}
                        className="w-full text-slate-800 bg-transparent focus:outline-none tabular-nums leading-snug"
                      />
                    </td>
                  ))}
                  <td className="p-1 text-center align-top">
                    <button
                      type="button"
                      onClick={() => removeRow(rIdx)}
                      disabled={block.rows.length <= 1}
                      className="text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer mt-0.5"
                      title="Remove row"
                    >
                      <Trash2 className="w-3 h-3 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const startIdx = slice && slice.kind === 'table' ? slice.start : 0;
  const endIdx = slice && slice.kind === 'table' ? slice.end : block.rows.length;
  const isContinuation = startIdx > 0;
  const visibleRows = block.rows.slice(startIdx, endIdx);

  return (
    <figure className="space-y-1.5">
      {(block.caption || isContinuation) && (
        <figcaption
          data-sub-header="true"
          className="text-xs font-semibold text-slate-700 flex items-baseline justify-between gap-2 break-words"
        >
          <span>
            <InlineRichText
              text={block.caption || 'Table'}
              variables={variables}
              showRawTokens={showRawTokens}
            />
          </span>
          {isContinuation && (
            <span className="text-[11px] font-normal text-slate-400 shrink-0">
              (continued)
            </span>
          )}
        </figcaption>
      )}
      <div className="overflow-x-auto border border-slate-300 rounded-sm">
        <table className="w-full border-collapse text-[13px] tabular-nums">
          <thead data-sub-header="true">
            <tr className="bg-slate-50 border-b border-slate-300">
              {block.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-semibold text-slate-900 border-r border-slate-200 last:border-r-0 break-words"
                >
                  <InlineRichText
                    text={h}
                    variables={variables}
                    showRawTokens={showRawTokens}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, offset) => {
              const globalRowIdx = startIdx + offset;
              return (
                <tr
                  key={globalRowIdx}
                  data-sub-item-index={globalRowIdx}
                  className="border-b border-slate-200 last:border-b-0 print-break-avoid"
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3 py-2 text-slate-700 border-r border-slate-200 last:border-r-0 break-words align-top"
                    >
                      <InlineRichText
                        text={cell}
                        variables={variables}
                        showRawTokens={showRawTokens}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </figure>
  );
};
