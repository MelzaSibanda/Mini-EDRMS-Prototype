import { SESSION_STORAGE_KEY, legacySamplePrefix, migrateDemonstrationBranding } from '../src/app/lib/legacy-branding-compatibility';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router';
import 'fake-indexeddb/auto';
const values = new Map();
globalThis.localStorage = {
  getItem: k => values.get(k) || null,
  setItem: (k, v) => values.set(k, v),
  removeItem: k => values.delete(k)
};
globalThis.sessionStorage = {
  getItem: k => k === SESSION_STORAGE_KEY ? JSON.stringify({
    role: 'records_manager',
    expires: Date.now() + 100000
  }) : null,
  setItem: () => {},
  removeItem: () => {}
};
const core = await import('../src/app/lib/enterprise');
const repo = await import('../src/app/lib/repository');
const domain = {
  ...core,
  ...repo
};
const validation = await import('../src/app/lib/file-validation');
const pages = await import('../src/app/components/EnterprisePages');
const {
  AuthProvider
} = await import('../src/hooks/use-auth');
const {
  Login,
  EnterpriseLayout,
  navigation
} = await import('../src/app/components/EnterpriseLayout');
const manager = domain.identity('records_manager');
const auditor = domain.identity('auditor');
const technical = domain.identity('system_administrator');
const file = (content, name = 'fictional.txt') => new File([content], name, {
  type: 'text/plain'
});
const info = {
  title: 'Fictional repository document',
  type: 'Correspondence',
  department: 'Operations',
  owner: manager.name,
  classification: 'Internal'
};
let uploaded;
test('migration preserves original IDs, version attachments and business history', () => {
  const legacy = core.initialState();
  legacy.records[0].versions[0].fileId = 'historical-id';
  delete legacy.records[0].storageStatus;
  const result = core.normaliseState(legacy);
  assert.equal(result.records[0].id, legacy.records[0].id);
  assert.deepEqual(result.records[0].versions, legacy.records[0].versions);
  assert.deepEqual(result.records[0].business, legacy.records[0].business);
  assert.equal(result.records[0].storageStatus, 'Available');
  assert.equal(result.records[11].storageStatus, 'Archived');
  assert.equal(result.records[1].storageStatus, 'Metadata only');
});
test('technical administration does not grant document access or file upload', async () => {
  assert.equal(core.visible(technical).length, 0);
  await assert.rejects(() => repo.uploadDocument(technical, file('blocked'), info), /authorise/);
});
test('upload stores the actual file and its automatic metadata', async () => {
  uploaded = await repo.uploadDocument(manager, file('Fictional original attachment'), {
    ...info,
    tags: ['regional', 'notice'],
    sourceReference: 'FIC-REF-001',
    extractedText: 'Searchable extracted content'
  });
  const current = repo.currentVersion(uploaded);
  assert.equal(await (await core.getFile(current.fileId)).text(), 'Fictional original attachment');
  assert.equal(current.fileType, 'text/plain');
  assert.equal(current.fileSize, Buffer.byteLength('Fictional original attachment'));
  assert.equal(uploaded.uploadedById, manager.id);
  assert.equal(uploaded.storageStatus, 'Available');
  assert.equal(core.snapshot().audit[0].action, 'Document uploaded');
});
test('search filters metadata, tags, references, file names and saved content', () => {
  assert.ok(repo.queryDocuments(manager, {
    q: 'FIC-REF-001'
  }).documents.some(r => r.id === uploaded.id));
  assert.ok(repo.queryDocuments(manager, {
    q: 'regional',
    department: 'Operations',
    type: 'Correspondence',
    format: 'txt'
  }).documents.some(r => r.id === uploaded.id));
  assert.equal(repo.queryDocuments(manager, {
    q: 'Searchable extracted content'
  }).total, 0);
  assert.ok(repo.queryDocuments(manager, {
    q: 'Searchable extracted content',
    content: '1'
  }).total > 0);
  assert.ok(repo.queryDocuments(manager, {
    mine: '1'
  }).documents.some(r => r.id === uploaded.id));
});
test('authorised preview and download retrieve the stored content', async () => {
  const preview = await repo.readDocumentFile(manager, uploaded.id, '1.0', 'preview');
  assert.equal(await preview.blob.text(), 'Fictional original attachment');
  const download = await repo.readDocumentFile(manager, uploaded.id, '1.0', 'download');
  assert.equal(download.version.fileName, 'fictional.txt');
  assert.equal(core.snapshot().audit[0].action, 'Download requested');
});
test('metadata updates preserve binary versions and index new tags', () => {
  const previous = core.snapshot().records.find(r => r.id === uploaded.id).versions;
  repo.updateMetadata(manager, uploaded.id, {
    title: 'Revised fictional title',
    tags: ['updated'],
    sourceReference: 'FIC-REF-002'
  });
  const r = core.snapshot().records.find(r => r.id === uploaded.id);
  assert.deepEqual(r.versions, previous);
  assert.equal(repo.queryDocuments(manager, {
    q: 'FIC-REF-002'
  }).total, 1);
  assert.equal(core.snapshot().audit[0].action, 'Metadata updated');
});
test('replacement creates independent minor and major versions', async () => {
  await repo.uploadVersion(manager, uploaded.id, file('Fictional replacement'), 'Updated source file');
  await repo.uploadVersion(manager, uploaded.id, file('Fictional major replacement'), 'Major version', true);
  const r = core.snapshot().records.find(r => r.id === uploaded.id);
  assert.deepEqual(r.versions.map(v => v.number), ['1.0', '1.1', '2.0']);
  assert.equal(new Set(r.versions.map(v => v.fileId)).size, 3);
  assert.equal(await (await core.getFile(r.versions[0].fileId)).text(), 'Fictional original attachment');
  assert.equal(r.extractedText, '');
});
test('restricted documents do not appear in auditor search and never reach the file reader', async () => {
  const r = await repo.uploadDocument(manager, file('Fictional restricted file'), {
    ...info,
    title: 'Fictional restricted record',
    classification: 'Restricted'
  });
  assert.equal(repo.queryDocuments(auditor, {
    q: r.title
  }).total, 0);
  let reads = 0;
  await assert.rejects(() => repo.readDocumentFile(auditor, r.id, '1.0', 'download', async () => {
    reads++;
    return new Blob();
  }), /unavailable/);
  assert.equal(reads, 0);
});
test('read-only identities cannot edit, upload versions or download files', async () => {
  assert.throws(() => repo.updateMetadata(auditor, uploaded.id, {
    title: 'Unauthorised'
  }), /authorise/);
  await assert.rejects(() => repo.uploadVersion(auditor, uploaded.id, file('not stored'), 'Invalid'), /authorise/);
  let reads = 0;
  await assert.rejects(() => repo.readDocumentFile(auditor, uploaded.id, '1.0', 'download', async () => {
    reads++;
    return new Blob();
  }), /authorise/);
  assert.equal(reads, 0);
});
test('invalid, empty, oversized and disguised files are rejected', async () => {
  await assert.rejects(() => validation.validateDocumentFile(file('script', 'bad.exe')), /Allowed formats/);
  await assert.rejects(() => validation.validateDocumentFile(file('text', 'fake.pdf')), /does not match/);
  await assert.rejects(() => validation.validateDocumentFile(file('', 'empty.txt')), /empty/);
  await assert.rejects(() => validation.validateDocumentFile(new File([new Uint8Array(21 * 1024 * 1024)], 'large.txt')), /20 MB/);
});
test('failed metadata persistence rolls back the newly stored file', async () => {
  const before = core.snapshot();
  const write = localStorage.setItem;
  localStorage.setItem = () => {
    throw new Error('Quota exceeded');
  };
  let storedId;
  const services = {
    validate: validation.validateDocumentFile,
    store: async f => {
      storedId = await core.saveFile(f);
      return storedId;
    },
    remove: core.removeUnlinkedFile
  };
  try {
    await assert.rejects(() => repo.uploadDocument(manager, file('Rollback attachment'), info, services), /Quota/);
    assert.equal(core.snapshot(), before);
    await assert.rejects(() => core.getFile(storedId), /No attachment/);
  } finally {
    localStorage.setItem = write;
  }
});
test('failed binary upload never creates a misleading document entry', async () => {
  const before = core.snapshot();
  await assert.rejects(() => repo.uploadDocument(manager, file('Storage error'), info, {
    validate: validation.validateDocumentFile,
    store: async () => {
      throw new Error('Upload failed');
    },
    remove: async () => {}
  }), /Upload failed/);
  assert.equal(core.snapshot(), before);
});
test('configuration changes mandatory fields without forcing irrelevant metadata', async () => {
  repo.configureRepository(technical, {
    requiredFields: {
      Correspondence: ['sourceReference']
    }
  });
  await assert.rejects(() => repo.uploadDocument(manager, file('Missing reference'), info), /sourceReference/);
  repo.configureRepository(technical, {
    requiredFields: {}
  });
});
test('collections query existing documents without duplicating binaries', () => {
  const before = core.snapshot().records.length;
  repo.addCollection(technical, {
    name: 'Operations correspondence',
    description: 'Fictional collection',
    department: 'Operations',
    type: 'Correspondence'
  });
  const c = repo.configFor().collections.at(-1);
  assert.ok(repo.queryDocuments(manager, {
    collection: c.id
  }).documents.some(r => r.id === uploaded.id));
  assert.equal(core.snapshot().records.length, before);
});
test('archive requires a configured process and preserves the document files', async () => {
  assert.throws(() => repo.archiveDocument(manager, uploaded.id, 'Archive'), /approval reference/);
  repo.configureRepository(technical, {
    archiveEnabled: true,
    archiveReference: 'FIC-ARCHIVE-RULE'
  });
  repo.archiveDocument(manager, uploaded.id, 'Fictional process complete');
  assert.equal(repo.queryDocuments(manager, {
    q: 'FIC-REF-002'
  }).total, 0);
  assert.equal(repo.queryDocuments(manager, {
    status: 'Archived',
    q: 'FIC-REF-002'
  }).total, 1);
  assert.equal(await (await core.getFile(uploaded.versions[0].fileId)).text(), 'Fictional original attachment');
  repo.archiveDocument(manager, uploaded.id, 'Restore for review', true);
});
test('removal is permission gated and retains linked file and metadata history', async () => {
  const r = await repo.uploadDocument(manager, file('Fictional removed content'), {
    ...info,
    title: 'Fictional removal record'
  });
  assert.throws(() => repo.deleteDocument(manager, r.id, 'Remove'), /disabled/);
  repo.configureRepository(technical, {
    deleteEnabled: true,
    deleteReference: 'FIC-REMOVE-RULE'
  });
  assert.throws(() => repo.deleteDocument(auditor, r.id, 'Invalid removal'), /authorise/);
  repo.deleteDocument(manager, r.id, 'Fictional approved rule');
  assert.equal(repo.queryDocuments(manager, {
    q: r.title
  }).total, 0);
  assert.equal(core.snapshot().records.find(doc => doc.id === r.id).storageStatus, 'Deleted');
  assert.equal(await (await core.getFile(r.versions[0].fileId)).text(), 'Fictional removed content');
});
test('legal holds preserved from existing data block removal', () => {
  const r = core.snapshot().records.find(r => r.id === '3');
  const officer = {
    ...core.identity('department_manager'),
    department: 'Procurement'
  };
  assert.throws(() => repo.archiveDocument({
    ...officer,
    permissions: [...officer.permissions, 'archive']
  }, r.id, 'Archive'), /hold/);
});
test('browsing supports pagination and title ordering', () => {
  for (let i = 0; i < 16; i++) repo.createRecord(manager, {
    ...info,
    title: 'Fictional pagination ' + String(i).padStart(2, '0')
  });
  const first = repo.queryDocuments(manager, {
    q: 'Fictional pagination',
    sort: 'title'
  }, 5);
  const second = repo.queryDocuments(manager, {
    q: 'Fictional pagination',
    sort: 'title',
    page: '2'
  }, 5);
  assert.equal(first.total, 16);
  assert.equal(first.pages, 4);
  assert.equal(second.documents.length, 5);
  assert.ok(!first.documents.some(r => second.documents.some(s => s.id === r.id)));
  assert.match(first.documents[0].title, /00$/);
});
test('cross-tab conflicts preserve the current snapshot', () => {
  const saved = values.get(core.key);
  values.set(core.key, JSON.stringify({
    ...core.snapshot(),
    recent: ['other-tab']
  }));
  assert.throws(() => repo.createRecord(manager, info), /another tab/);
  values.set(core.key, saved);
});
test('repository pages render and navigation omits operational modules', () => {
  for (const Component of [pages.Dashboard, pages.Documents, pages.Capture, pages.Directory, pages.Collections, pages.AuditTrail, pages.Settings, pages.NotFound, Login]) {
    const html = renderToString(<AuthProvider><MemoryRouter><Component /></MemoryRouter></AuthProvider>);
    assert.ok(html.length > 50);
    assert.doesNotMatch(html, /Pending approvals|Retention &amp; Disposition|Workflow register/);
  }
  const html = renderToString(<AuthProvider><MemoryRouter initialEntries={['/documents/' + uploaded.id]}><Routes><Route path='/documents/:id' element={<pages.Detail />} /></Routes></MemoryRouter></AuthProvider>);
  assert.match(html, /Revised fictional title/);
  assert.ok(!navigation.flatMap(g => g[1]).some(n => /tasks|workflows|cases|disputes|enforcement|retention/.test(n[1])));
});
const metadata = await import('../src/app/lib/document-metadata');
const scanner = await import('../src/app/lib/scan-document');
const sample = 'Title: Operational Guidelines\nDocument type: Guidelines\nDepartment: Operations\nRecord category: Operations\nRegion: Head Office\nOwner: Demonstration Operations Contributor\nSecurity classification: Confidential\nEffective date: 12/10/2026\nExpiry date: 31 December 2026\nReview date: 2026-11-01\nDocument number: SAMPLE-OPS-001\nBusiness unit: Operations';
test('document text identifies type and extracts labelled metadata', () => {
  const result = metadata.inferMetadata(sample, 'attachment.txt');
  assert.equal(result.type.value, 'Guidelines');
  assert.equal(result.department.value, 'Operations');
  assert.equal(result.owner.value, 'Demonstration Operations Contributor');
  assert.equal(result.classification.value, 'Confidential');
  assert.equal(result.effective.value, '2026-10-12');
  assert.equal(result.expiry.value, '2026-12-31');
  assert.equal(result.sourceReference.value, 'SAMPLE-OPS-001');
  assert.equal(result.region.value, 'Head Office');
  assert.ok(!('retentionRule' in result));
});
test('unlabelled body references do not invent security levels, dates or owners', () => {
  const result = metadata.inferMetadata('Policy on confidential information\nDiscussed by Fictional Officer on 12/10/2026.', 'document.pdf');
  assert.equal(result.type.value, 'Policy');
  assert.equal(result.classification, undefined);
  assert.equal(result.effective, undefined);
  assert.equal(result.owner, undefined);
});
test('unknown document types remain available for manual classification', () => {
  const result = metadata.inferMetadata('Uncategorised administrative note\nGeneral reference information', 'attachment.txt');
  assert.equal(result.type, undefined);
});
test('date parser uses South African day-first dates and rejects invalid dates', () => {
  assert.equal(metadata.parseDocumentDate('03/04/2026'), '2026-04-03');
  assert.equal(metadata.parseDocumentDate('31/02/2026'), undefined);
  assert.equal(metadata.parseDocumentDate('29 February 2024'), '2024-02-29');
  assert.equal(metadata.parseDocumentDate('not a date'), undefined);
});
test('scan suggestions preserve user edits and department access scope', () => {
  const current = {
    title: 'User edited title',
    department: 'Administration',
    type: ''
  };
  const merged = metadata.mergeScannedMetadata(current, metadata.inferMetadata(sample, 'attachment.txt'), new Set(['title']), ['Administration']);
  assert.equal(merged.fields.title, 'User edited title');
  assert.equal(merged.fields.department, 'Administration');
  assert.equal(merged.fields.type, 'Guidelines');
  assert.equal(merged.skipped.length, 2);
});
test('text attachment scanning reads actual file content', async () => {
  const result = await scanner.scanDocument(new File([sample], 'attachment.txt', {
    type: 'text/plain'
  }), new AbortController().signal, () => {});
  assert.equal(result.method, 'Text extraction');
  assert.equal(result.suggestions.sourceReference.value, 'SAMPLE-OPS-001');
  assert.match(result.text, /Operational Guidelines/);
});
test('unsupported, empty and oversized attachments report actionable errors', () => {
  assert.throws(() => scanner.validateScanFile(new File(['data'], 'legacy.doc')), /supports/);
  assert.throws(() => scanner.validateScanFile(new File([], 'empty.txt')), /empty/);
  assert.throws(() => scanner.validateScanFile(new File([new Uint8Array(21 * 1024 * 1024)], 'large.txt')), /20 MB/);
});
test('cancelled scans cannot produce suggested metadata', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => scanner.scanDocument(new File([sample], 'attachment.txt'), controller.signal, () => {}), {
    name: 'AbortError'
  });
});
test('source reference persists without replacing the controlled record number', () => {
  const record = domain.createRecord(manager, {
    title: 'Fictional scanned record',
    type: 'Correspondence',
    sourceReference: 'SAMPLE-OPS-001'
  });
  assert.equal(record.sourceReference, 'SAMPLE-OPS-001');
  assert.match(record.number, /^EDMS-/);
});
test('English OCR recognises an image using local engine and language data', async () => {
  const {
    createCanvas
  } = await import('@napi-rs/canvas');
  const {
    createWorker
  } = await import('tesseract.js');
  const canvas = createCanvas(1400, 400);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 1400, 400);
  ctx.fillStyle = 'black';
  ctx.font = '40px Arial';
  ctx.fillText('Title: Operational Guidelines', 40, 80);
  ctx.fillText('Department: Operations', 40, 160);
  ctx.fillText('Owner: Fictional Officer', 40, 240);
  const worker = await createWorker('eng', 1, {
    langPath: 'node_modules/@tesseract.js-data/eng/4.0.0',
    cacheMethod: 'none'
  });
  try {
    const result = await worker.recognize(canvas.toBuffer('image/png'));
    assert.match(result.data.text, /Operational Guidelines/i);
    assert.equal(metadata.inferMetadata(result.data.text, 'scan.png').type.value, 'Guidelines');
  } finally {
    await worker.terminate();
  }
});
test('Word attachments extract text and populate metadata', async () => {
  const {
    default: JSZip
  } = await import('jszip');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Title: Supplier Service Agreement</w:t></w:r></w:p><w:p><w:r><w:t>Department: Procurement</w:t></w:r></w:p></w:body></w:document>');
  const file = new File([await zip.generateAsync({
    type: 'uint8array'
  })], 'agreement.docx');
  const result = await scanner.scanDocument(file, new AbortController().signal, () => {});
  assert.equal(result.suggestions.type.value, 'Contract');
  assert.equal(result.suggestions.department.value, 'Procurement');
  assert.ok(result.warnings.length);
});
test('PDF attachments extract text and suggest metadata', async () => {
  const reader = await import('../src/app/lib/pdf-reader');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
  const stream = 'BT /F1 16 Tf 50 750 Td (Title: Operational Guidelines) Tj 0 -30 Td (Department: Operations) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let data = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((value, i) => {
    offsets.push(Buffer.byteLength(data));
    data += `${i + 1} 0 obj\n${value}\nendobj\n`;
  });
  const xref = Buffer.byteLength(data);
  data += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const result = await reader.readPdf(new File([data], 'inspection.pdf'), new AbortController().signal, () => {});
  assert.equal(result.pages, 1);
  assert.equal(result.ocrUsed, false);
  assert.equal(metadata.inferMetadata(result.text, 'inspection.pdf').department.value, 'Operations');
});
test('empty extracted text and late cancellation do not produce autofill results', async () => {
  await assert.rejects(() => scanner.scanDocument(new File(['   '], 'blank.txt'), new AbortController().signal, () => {}), /No readable text/);
  const controller = new AbortController();
  const file = new File([sample], 'slow.txt');
  file.text = async () => {
    controller.abort();
    return sample;
  };
  await assert.rejects(() => scanner.scanDocument(file, controller.signal, () => {}), {
    name: 'AbortError'
  });
});
test('classification tiers cannot be weakened by technical configuration', () => {
  const config = repo.configFor();
  assert.throws(() => repo.configureRepository(technical, {
    classifications: config.classifications.map(c => c.name === 'Restricted' ? {
      ...c,
      access: 'internal'
    } : c)
  }), /cannot be changed/);
});
test('classification changes require document access-management permission', () => {
  const owner = core.identity('document_owner');
  assert.throws(() => repo.updateMetadata(owner, uploaded.id, {
    classification: 'Public'
  }), /authorise/);
});
test('XLSX and PPTX upload validation recognises their package structures', async () => {
  const {
    default: JSZip
  } = await import('jszip');
  for (const [extension, entry] of [['xlsx', 'xl/workbook.xml'], ['pptx', 'ppt/presentation.xml']]) {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<Types/>');
    zip.file(entry, '<document/>');
    const bytes = await zip.generateAsync({
      type: 'uint8array'
    });
    const info = await validation.validateDocumentFile(new File([bytes], 'fictional.' + extension));
    assert.equal(info.extension, extension);
  }
  const macro = new JSZip();
  macro.file('[Content_Types].xml', '<Types/>');
  macro.file('xl/workbook.xml', '<workbook/>');
  macro.file('xl/vbaProject.bin', 'untrusted macro');
  const bytes = await macro.generateAsync({
    type: 'uint8array'
  });
  await assert.rejects(() => validation.validateDocumentFile(new File([bytes], 'macro.xlsx')), /does not match/);
});
test('Recent Documents respects the selected title sort', () => {
  const html = renderToString(<AuthProvider><MemoryRouter initialEntries={['/documents/recent?q=Fictional%20pagination&sort=title']}><pages.Documents mode="recent" /></MemoryRouter></AuthProvider>);
  const first = html.indexOf('Fictional pagination 00');
  const second = html.indexOf('Fictional pagination 01');
  assert.ok(first >= 0 && second > first, 'Title sorting must override the recent-view default');
});
const product = await import('../src/app/lib/product');
const oldDemo = () => ({
  ...core.initialState().records[5],
  number: legacySamplePrefix + '0006',
  title: 'HR Policy Review',
  type: 'Policy',
  department: 'Human Resources',
  category: 'Human Resources',
  owner: 'Fictional Human Resources Officer',
  createdBy: 'Fictional Records Officer',
  classification: 'Confidential',
  description: 'Fictional evaluation record. No real employee, employer, case or agreement information is represented.',
  tags: [],
  versions: [{
    number: '1.0',
    author: 'Fictional Records Officer',
    date: '2026-09-12T08:00:00+02:00',
    description: 'Initial controlled capture'
  }, {
    number: '1.1',
    author: 'Fictional Human Resources Officer',
    date: '2026-10-01T10:00:00+02:00',
    description: 'Metadata and classification review'
  }]
});
test('EDMS identity is visible in login and authenticated shell with no old brand', () => {
  for (const Component of [Login, EnterpriseLayout]) {
    const html = renderToString(<AuthProvider><MemoryRouter><Component /></MemoryRouter></AuthProvider>);
    assert.match(html, new RegExp(product.PRODUCT_NAME));
    assert.match(html, /EDMS/);
    assert.match(html, /Centralised Document Storage &amp; Retrieval/);
    assert.ok(!html.toLowerCase().includes(legacySamplePrefix.split('-')[0].toLowerCase()));
    assert.doesNotMatch(html, /Collective Bargaining|Dispute Resolution|Enforcement Officer/);
  }
});
test('fresh demonstration records use neutral departments and clearly labelled examples', () => {
  const state = core.normaliseState(core.initialState());
  assert.equal(state.records.length, 12);
  for (const r of state.records) {
    assert.match(r.number, /^EDMS-SAMPLE-/);
    assert.match(r.description, /Demonstration metadata only/);
    assert.ok(state.repositoryConfig.departments.includes(r.department));
    assert.ok(state.repositoryConfig.documentTypes.includes(r.type));
    assert.ok(r.versions.every(v => !v.fileId));
  }
  assert.deepEqual(core.departments, ['Human Resources', 'Finance', 'Information Technology', 'Operations', 'Administration', 'Procurement']);
  assert.ok(!core.roles.some(r => r in compatibilityRoles));
});
const compatibilityRoles = (await import('../src/app/lib/legacy-branding-compatibility')).legacyRoles;
test('original demonstration labels migrate without resetting IDs or historical fields', () => {
  const old = oldDemo();
  old.business = {
    Reference: 'Preserve historical reference'
  };
  old.legalHold = true;
  old.effective = '2026-09-01';
  const state = {
    ...core.initialState(),
    records: [old]
  };
  const result = migrateDemonstrationBranding(state).records[0];
  assert.equal(result.id, old.id);
  assert.equal(result.title, 'Training Materials');
  assert.match(result.number, /^EDMS-SAMPLE-/);
  assert.equal(result.classification, old.classification);
  assert.equal(result.effective, old.effective);
  assert.equal(result.legalHold, true);
  assert.deepEqual(result.business, old.business);
  assert.deepEqual(result.versions.map(v => v.date), old.versions.map(v => v.date));
  assert.equal(state.records[0].title, old.title);
});
test('edited demonstration records and attached versions are excluded from label replacement', () => {
  const variants = [{
    title: 'User-owned title'
  }, {
    modified: '2026-10-14T12:00:00Z'
  }, {
    tags: ['user tag']
  }, {
    sourceReference: 'User reference',
    versions: [{
      ...oldDemo().versions[0],
      fileId: 'stored-binary'
    }, oldDemo().versions[1]]
  }, {
    extractedText: 'User content'
  }, {
    owner: 'Actual document owner'
  }];
  for (const change of variants) {
    const r = {
      ...oldDemo(),
      ...change
    };
    assert.deepEqual(migrateDemonstrationBranding({
      ...core.initialState(),
      records: [r]
    }).records[0], r);
  }
});
test('user documents and configuration remain available after rebranding', () => {
  const r = {
    ...oldDemo(),
    id: 'user-document',
    number: 'EXISTING-001',
    type: 'Custom type',
    department: 'Custom department'
  };
  const config = {
    ...repo.configFor(),
    departments: ['Custom department'],
    documentTypes: ['Custom type'],
    requiredFields: {
      'Custom type': ['sourceReference']
    },
    collections: [{
      id: 'custom',
      name: 'My collection',
      description: 'Keep this',
      department: 'Custom department',
      type: 'Custom type'
    }],
    archiveEnabled: true,
    archiveReference: 'AUTH-001'
  };
  const result = migrateDemonstrationBranding({
    ...core.initialState(),
    records: [r],
    repositoryConfig: config
  });
  assert.deepEqual(result.records, [r]);
  assert.deepEqual(result.repositoryConfig, config);
  const noConfig = migrateDemonstrationBranding({
    ...core.initialState(),
    records: [r]
  });
  assert.ok(noConfig.repositoryConfig.documentTypes.includes('Custom type'));
  assert.ok(noConfig.repositoryConfig.departments.includes('Custom department'));
  assert.equal(core.key, compatibilityKeys.METADATA_STORAGE_KEY);
});
const compatibilityKeys = await import('../src/app/lib/legacy-branding-compatibility');
test('legacy sessions retain supported roles while product choices remain neutral', () => {
  for (const r of Object.keys(compatibilityRoles)) {
    assert.equal(core.isSupportedRole(r), true);
    assert.equal(core.roleLabel(r), 'Department Contributor');
  }
  assert.equal(core.isSupportedRole('toString'), false);
  assert.equal(core.isSupportedRole('unknown'), false);
});
