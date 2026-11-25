export interface CompressedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
}

/**
 * Validates that an image source URL is safe to bind to <img src>.
 */
export function isSafeImageSrc(src: string): boolean {
  const trimmed = (src || '').trim();
  if (!trimmed) return false;
  if (/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);/i.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  return false;
}

/**
 * Client-side image resizer & compressor so uploaded lab figures stay sharp for print
 * while remaining lightweight inside browser localStorage.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1400,
  quality = 0.84
): Promise<CompressedImageResult> {
  if (file.type === 'image/svg+xml') {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl,
      width: 800,
      height: 500,
      sizeKb: Math.max(1, Math.round(dataUrl.length / 1024)),
    };
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(rawDataUrl);

  const scale = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;
  const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
  const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      dataUrl: rawDataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
      sizeKb: Math.max(1, Math.round(rawDataUrl.length / 1024)),
    };
  }

  const isPng = file.type === 'image/png';
  if (!isPng) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Try webp first for small size & transparency support, fallback to png/jpeg
  let outputUrl = canvas.toDataURL('image/webp', quality);
  if (!outputUrl.startsWith('data:image/webp')) {
    outputUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
  }

  // If original file was already smaller (e.g. tiny diagram PNG), keep original
  const finalUrl = outputUrl.length < rawDataUrl.length ? outputUrl : rawDataUrl;

  return {
    dataUrl: finalUrl,
    width: targetW,
    height: targetH,
    sizeKb: Math.max(1, Math.round(finalUrl.length / 1024)),
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read image file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Invalid image file'));
    img.src = src;
  });
}
