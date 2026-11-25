import React, { useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ImageIcon,
  Link2,
  Trash2,
  Upload,
} from 'lucide-react';
import { ImageAlign, ImageBlock, ImageWidthPreset } from '../../types/lab';
import { compressImageFile, isSafeImageSrc } from '../../lib/imageUtils';
import { InlineRichText } from '../InlineRichText';
import { AutoGrowTextarea } from '../AutoGrowTextarea';

interface ImageBlockRendererProps {
  block: ImageBlock;
  editing: boolean;
  variables: Record<string, string>;
  showRawTokens: boolean;
  onChange?: (updated: ImageBlock) => void;
}

const WIDTH_PRESETS: ImageWidthPreset[] = [40, 65, 85, 100];

export const ImageBlockRenderer: React.FC<ImageBlockRendererProps> = ({
  block,
  editing,
  variables,
  showRawTokens,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [urlInput, setUrlInput] = useState(
    block.src.startsWith('data:') ? '' : block.src
  );
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const safeSrc = isSafeImageSrc(block.src) ? block.src : '';

  const handleFileSelected = async (file?: File) => {
    if (!file || !onChange) return;
    setUploading(true);
    setUploadInfo(null);
    setLoadError(false);
    try {
      const result = await compressImageFile(file);
      onChange({
        ...block,
        src: result.dataUrl,
        alt: block.alt || file.name.replace(/\.[^.]+$/, ''),
      });
      setUrlInput('');
      setUploadInfo(`Optimized to ${result.sizeKb} KB (${result.width}×${result.height})`);
    } catch {
      setUploadInfo('Could not process that image file.');
    } finally {
      setUploading(false);
    }
  };

  const alignJustify =
    block.align === 'left'
      ? 'justify-start'
      : block.align === 'right'
        ? 'justify-end'
        : 'justify-center';

  const renderPreviewImage = () => {
    if (!safeSrc) {
      return (
        <div className="w-full py-10 px-4 border border-dashed border-slate-300 rounded-md bg-slate-50/70 flex flex-col items-center justify-center gap-2 text-center">
          <ImageIcon className="w-7 h-7 text-slate-400" />
          <div className="text-xs font-medium text-slate-600">
            No figure attached yet
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Diagram or Photo
            </button>
          )}
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="w-full py-8 px-4 border border-slate-200 rounded-md bg-slate-50 flex flex-col items-center justify-center gap-1.5 text-center">
          <ImageIcon className="w-6 h-6 text-slate-400" />
          <div className="text-xs font-medium text-slate-700">
            Unable to load image preview
          </div>
          <div className="text-[11px] text-slate-500 max-w-sm break-words">
            {block.alt || 'Check the image URL or upload a local file instead.'}
          </div>
        </div>
      );
    }

    return (
      <img
        src={safeSrc}
        alt={block.alt || block.caption || 'Lab figure'}
        referrerPolicy="no-referrer"
        onError={() => setLoadError(true)}
        className={`block w-full h-auto rounded ${
          block.bordered ? 'border border-slate-200 p-1.5 bg-white' : ''
        }`}
      />
    );
  };

  if (editing && onChange) {
    return (
      <div
        className="border border-slate-200 rounded-md p-3.5 bg-slate-50/60 space-y-3"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDrop={(e) => {
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) {
            e.preventDefault();
            e.stopPropagation();
            void handleFileSelected(file);
          }
        }}
      >
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Optimizing...' : safeSrc ? 'Replace Image' : 'Upload Image'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileSelected(file);
                e.currentTarget.value = '';
              }}
              className="hidden"
            />
            {safeSrc && (
              <button
                type="button"
                onClick={() => {
                  onChange({ ...block, src: '' });
                  setUrlInput('');
                  setLoadError(false);
                }}
                title="Remove image"
                className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-white cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Width Presets */}
            <div className="inline-flex items-center bg-white border border-slate-200 rounded p-0.5">
              {WIDTH_PRESETS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onChange({ ...block, width: w })}
                  className={`px-1.5 py-0.5 text-[11px] font-mono tabular-nums rounded cursor-pointer ${
                    block.width === w
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {w}%
                </button>
              ))}
            </div>

            {/* Alignment */}
            <div className="inline-flex items-center bg-white border border-slate-200 rounded p-0.5">
              {(
                [
                  { id: 'left', icon: AlignLeft, label: 'Align left' },
                  { id: 'center', icon: AlignCenter, label: 'Center' },
                  { id: 'right', icon: AlignRight, label: 'Align right' },
                ] as Array<{ id: ImageAlign; icon: React.FC<{ className?: string }>; label: string }>
              ).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  title={label}
                  onClick={() => onChange({ ...block, align: id })}
                  className={`p-1 rounded cursor-pointer ${
                    block.align === id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={block.bordered}
                onChange={(e) => onChange({ ...block, bordered: e.target.checked })}
                className="rounded border-slate-300"
              />
              Frame
            </label>
          </div>
        </div>

        {/* External URL Option */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && urlInput.trim()) {
                  e.preventDefault();
                  setLoadError(false);
                  onChange({ ...block, src: urlInput.trim() });
                }
              }}
              placeholder="Or paste an https:// image URL and click Apply..."
              className="w-full pl-8 pr-2.5 py-1 text-xs text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!urlInput.trim()) return;
              setLoadError(false);
              onChange({ ...block, src: urlInput.trim() });
            }}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer shrink-0"
          >
            Apply URL
          </button>
        </div>

        {uploadInfo && (
          <div className="text-[11px] text-teal-700 font-medium">{uploadInfo}</div>
        )}

        {/* Live Sized Figure Preview */}
        <div className={`flex ${alignJustify}`}>
          <div style={{ width: `${block.width}%` }} className="max-w-full">
            {renderPreviewImage()}
          </div>
        </div>

        {/* Caption & Alt Text */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2">
            <AutoGrowTextarea
              value={block.caption}
              onChange={(val) => onChange({ ...block, caption: val })}
              placeholder="Figure caption (supports **bold**, $math$, and {{variables}})..."
              ariaLabel="Figure caption"
              singleLineWrap
              className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
            />
          </div>
          <input
            type="text"
            value={block.alt}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
            placeholder="Alt text for accessibility..."
            aria-label="Image alt text"
            className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>
    );
  }

  return (
    <figure className={`flex ${alignJustify} print-break-avoid`}>
      <div style={{ width: `${block.width}%` }} className="max-w-full space-y-2">
        {renderPreviewImage()}
        {block.caption && (
          <figcaption className="text-xs text-slate-600 text-center leading-relaxed break-words">
            <InlineRichText
              text={block.caption}
              variables={variables}
              showRawTokens={showRawTokens}
            />
          </figcaption>
        )}
      </div>
    </figure>
  );
};
