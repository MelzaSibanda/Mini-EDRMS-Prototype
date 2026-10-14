export const maxFileBytes = 20 * 1024 * 1024;
export const formats: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  bmp: 'image/bmp',
  gif: 'image/gif'
};
export async function validateDocumentFile(file: File) {
  const extension = file.name.split('.').at(-1)?.toLowerCase() || '';
  if (!file.size) throw new Error('The selected document is empty.');
  if (file.size > maxFileBytes) throw new Error('Choose a file no larger than 20 MB.');
  if (!formats[extension]) throw new Error('Allowed formats: PDF, DOCX, XLSX, PPTX, TXT, PNG, JPEG, WEBP, BMP and GIF.');
  const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const ascii = new TextDecoder().decode(bytes);
  const starts = (values: number[]) => values.every((v, i) => bytes[i] === v);
  let valid = false;
  if (extension === 'pdf') valid = ascii.startsWith('%PDF-');else if (['docx', 'xlsx', 'pptx'].includes(extension)) {
    if (starts([0x50, 0x4b])) {
      const {
        default: JSZip
      } = await import('jszip');
      const archive = await JSZip.loadAsync(await file.arrayBuffer());
      const required = extension === 'docx' ? 'word/document.xml' : extension === 'xlsx' ? 'xl/workbook.xml' : 'ppt/presentation.xml';
      valid = !!archive.file('[Content_Types].xml') && !!archive.file(required) && !Object.keys(archive.files).some(n => /vbaProject\.bin$/i.test(n));
    }
  } else if (extension === 'png') valid = starts([137, 80, 78, 71, 13, 10, 26, 10]);else if (extension === 'jpg' || extension === 'jpeg') valid = starts([255, 216, 255]);else if (extension === 'gif') valid = /^GIF8[79]a/.test(ascii);else if (extension === 'bmp') valid = ascii.startsWith('BM');else if (extension === 'webp') valid = ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';else if (extension === 'txt') {
    const all = new Uint8Array(await file.arrayBuffer());
    try {
      new TextDecoder('utf-8', {
        fatal: true
      }).decode(all);
      valid = !all.includes(0);
    } catch {
      valid = false;
    }
  }
  if (!valid) throw new Error('The file content does not match its extension, or the document format is unsupported.');
  return {
    extension,
    mime: formats[extension],
    size: file.size
  };
}
