import { inferMetadata, Suggestions } from './document-metadata';
export interface ScanProgress {
  stage: string;
  percent: number;
}
export interface ScanResult {
  text: string;
  suggestions: Suggestions;
  method: string;
  pages: number;
  totalPages: number;
  warnings: string[];
  ocrConfidence?: number;
}
export const supportedExtensions = ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'bmp'];
export function validateScanFile(file: File) {
  if (!file.size) throw new Error('This file is empty.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a document no larger than 20 MB.');
  const extension = file.name.split('.').at(-1)?.toLowerCase() || '';
  if (!supportedExtensions.includes(extension)) throw new Error('Automatic scanning supports PDF, DOCX, TXT, PNG, JPG, WEBP and BMP. Attach another format only after completing metadata manually.');
  return extension;
}
const check = (signal: AbortSignal) => {
  if (signal.aborted) throw new DOMException('Scan cancelled.', 'AbortError');
};
export async function scanDocument(file: File, signal: AbortSignal, onProgress: (p: ScanProgress) => void): Promise<ScanResult> {
  const extension = validateScanFile(file);
  check(signal);
  onProgress({
    stage: 'Reading attachment',
    percent: 2
  });
  const warnings: string[] = [];
  let text = '';
  let method = 'Text extraction';
  let pages = 1,
    totalPages = 1;
  let ocrConfidence: number | undefined;
  if (extension === 'txt') {
    text = await file.text();
  } else if (extension === 'docx') {
    const imported = await import('mammoth/mammoth.browser.js');
    const mammoth = imported.default || imported;
    check(signal);
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer()
    });
    text = result.value;
    warnings.push('Word text was extracted. Embedded images, signatures and text boxes may require manual review.');
  } else if (extension === 'pdf') {
    const pdf = await import('./pdf-reader');
    const result = await pdf.readPdf(file, signal, onProgress);
    text = result.text;
    pages = result.pages;
    totalPages = result.totalPages;
    warnings.push(...result.warnings);
    method = result.ocrUsed ? 'PDF text extraction + OCR' : 'PDF text extraction';
    ocrConfidence = result.confidence;
  } else {
    method = 'Image OCR';
    const result = await recogniseImage(file, signal, onProgress);
    text = result.text;
    ocrConfidence = result.confidence;
  }
  check(signal);
  if (!text.trim()) throw new Error('No readable text was found. Try a clearer scan or complete metadata manually.');
  if (text.length > 200000) {
    text = text.slice(0, 200000);
    warnings.push('Extracted text was limited to 200,000 characters. Review the full original document.');
  }
  if (ocrConfidence !== undefined && ocrConfidence < 65) warnings.push('OCR confidence is low. Check all detected fields against the original document.');
  onProgress({
    stage: 'Identifying document type and metadata',
    percent: 95
  });
  const suggestions = inferMetadata(text, file.name);
  if (ocrConfidence !== undefined && ocrConfidence < 65) for (const suggestion of Object.values(suggestions)) if (suggestion) suggestion.confidence = 'Low';
  onProgress({
    stage: 'Scan complete — review suggested metadata',
    percent: 100
  });
  return {
    text,
    suggestions,
    method,
    pages,
    totalPages,
    warnings,
    ocrConfidence
  };
}
export async function createOcrWorker(signal: AbortSignal, onProgress: (p: ScanProgress) => void) {
  const {
    createWorker
  } = await import('tesseract.js');
  check(signal);
  const base = import.meta.env.BASE_URL + 'ocr/';
  let stopped = false;
  const worker = await createWorker('eng', 1, {
    workerPath: base + 'worker.min.js',
    corePath: base + 'core',
    langPath: base + 'lang',
    logger: m => {
      if (!signal.aborted) onProgress({
        stage: m.status === 'recognizing text' ? 'Recognising document text' : m.status,
        percent: Math.round(m.progress * 85)
      });
    }
  });
  const stop = () => {
    if (!stopped) {
      stopped = true;
      void worker.terminate();
    }
  };
  signal.addEventListener('abort', stop, {
    once: true
  });
  if (signal.aborted) {
    stop();
    check(signal);
  }
  return {
    worker,
    close: async () => {
      signal.removeEventListener('abort', stop);
      if (!stopped) {
        stopped = true;
        await worker.terminate();
      }
    }
  };
}
async function recogniseImage(file: File, signal: AbortSignal, onProgress: (p: ScanProgress) => void) {
  const bitmap = await createImageBitmap(file);
  let ocr: Awaited<ReturnType<typeof createOcrWorker>> | undefined;
  try {
    check(signal);
    if (bitmap.width * bitmap.height > 32000000) throw new Error('This image is too large to scan in the browser. Resize it and try again.');
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image scanning is unavailable in this browser.');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    ocr = await createOcrWorker(signal, onProgress);
    const result = await ocr.worker.recognize(canvas);
    check(signal);
    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } finally {
    bitmap.close();
    await ocr?.close();
  }
}
