import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { createOcrWorker, ScanProgress } from './scan-document';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export async function readPdf(file: File, signal: AbortSignal, onProgress: (p: ScanProgress) => void) {
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    isEvalSupported: false,
    cMapUrl: import.meta.env.BASE_URL + 'pdf/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: import.meta.env.BASE_URL + 'pdf/standard_fonts/',
    wasmUrl: import.meta.env.BASE_URL + 'pdf/wasm/'
  });
  const abort = () => {
    void task.destroy();
  };
  signal.addEventListener('abort', abort, {
    once: true
  });
  let ocr: Awaited<ReturnType<typeof createOcrWorker>> | undefined;
  try {
    if (signal.aborted) throw new DOMException('Scan cancelled.', 'AbortError');
    const pdf = await task.promise;
    const totalPages = pdf.numPages;
    const pages = Math.min(totalPages, 40);
    const warnings: string[] = [];
    if (totalPages > 40) warnings.push(`Only the first 40 of ${totalPages} pages were scanned. Review remaining pages manually.`);
    const output: string[] = [];
    const confidences: number[] = [];
    let ocrUsed = false;
    for (let n = 1; n <= pages; n++) {
      if (signal.aborted) throw new DOMException('Scan cancelled.', 'AbortError');
      onProgress({
        stage: `Scanning PDF page ${n} of ${pages}`,
        percent: Math.round((n - 1) / pages * 85)
      });
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = content.items.map(item => 'str' in item ? item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ') : '').join('');
      if (text.trim().length >= 40) {
        output.push(text);
      } else {
        ocrUsed = true;
        ocr ||= await createOcrWorker(signal, p => onProgress({
          stage: `OCR page ${n} of ${pages}: ${p.stage}`,
          percent: Math.round((n - 1 + p.percent / 100) / pages * 85)
        }));
        const original = page.getViewport({
          scale: 1
        });
        const scale = Math.min(2, 2400 / Math.max(original.width, original.height));
        const viewport = page.getViewport({
          scale
        });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Scanned PDF rendering is unavailable in this browser.');
        const render = page.render({
          canvasContext: context,
          canvas,
          viewport
        });
        const cancel = () => render.cancel();
        signal.addEventListener('abort', cancel, {
          once: true
        });
        try {
          await render.promise;
          const result = await ocr.worker.recognize(canvas);
          output.push(result.data.text);
          confidences.push(result.data.confidence);
        } finally {
          signal.removeEventListener('abort', cancel);
          canvas.width = 0;
          canvas.height = 0;
        }
      }
      page.cleanup();
    }
    return {
      text: output.join('\n\n'),
      pages,
      totalPages,
      warnings,
      ocrUsed,
      confidence: confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : undefined
    };
  } finally {
    signal.removeEventListener('abort', abort);
    await ocr?.close();
    await task.destroy();
  }
}
