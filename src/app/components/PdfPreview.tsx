import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export default function PdfPreview({
  blob
}: {
  blob: Blob;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const documentRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let task: pdfjs.PDFDocumentLoadingTask | undefined;
    setError('');
    setTotal(0);
    setPage(1);
    void blob.arrayBuffer().then(data => {
      if (disposed) return;
      task = pdfjs.getDocument({
        data: new Uint8Array(data),
        isEvalSupported: false,
        cMapUrl: import.meta.env.BASE_URL + 'pdf/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: import.meta.env.BASE_URL + 'pdf/standard_fonts/',
        wasmUrl: import.meta.env.BASE_URL + 'pdf/wasm/'
      });
      return task.promise;
    }).then(pdf => {
      if (pdf && !disposed) {
        documentRef.current = pdf;
        setTotal(pdf.numPages);
      }
    }).catch(() => {
      if (!disposed) setError('This PDF could not be previewed. Download it if your role permits.');
    });
    return () => {
      disposed = true;
      documentRef.current = null;
      void task?.destroy();
    };
  }, [blob]);
  useEffect(() => {
    const pdf = documentRef.current;
    const target = canvas.current;
    if (!pdf || !target) return;
    let disposed = false;
    let render: pdfjs.RenderTask | undefined;
    void pdf.getPage(page).then(p => {
      if (disposed) return;
      const viewport = p.getViewport({
        scale: Math.min(1.5, 1000 / p.getViewport({
          scale: 1
        }).width)
      });
      target.width = viewport.width;
      target.height = viewport.height;
      const context = target.getContext('2d');
      if (!context) throw new Error('Canvas preview is unavailable.');
      render = p.render({
        canvas: target,
        canvasContext: context,
        viewport
      });
      return render.promise;
    }).catch(() => {
      if (!disposed) setError('This PDF page could not be displayed.');
    });
    return () => {
      disposed = true;
      render?.cancel();
    };
  }, [page, total]);
  return <div className="pdf-preview"><div className="pagination"><span>{total ? `Page ${page} of ${total}` : 'Loading PDF…'}</span><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous page</button><button disabled={!total || page >= total} onClick={() => setPage(page + 1)}>Next page</button></div>{error && <p className="error" role="alert">{error}</p>}<canvas ref={canvas} aria-label={'PDF page ' + page} /></div>;
}
