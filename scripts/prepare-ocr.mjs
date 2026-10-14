import { mkdir, copyFile, readdir, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'public','ocr');
await mkdir(path.join(output,'core'),{recursive:true});
await mkdir(path.join(output,'lang'),{recursive:true});
await copyFile(path.join(root,'node_modules/tesseract.js/dist/worker.min.js'),path.join(output,'worker.min.js'));
const core=path.join(root,'node_modules/tesseract.js-core');
for(const name of await readdir(core)){if(name.startsWith('tesseract-core')&&/\.(js|wasm)$/.test(name))await copyFile(path.join(core,name),path.join(output,'core',name));}
await copyFile(path.join(root,'node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz'),path.join(output,'lang','eng.traineddata.gz'));
console.log('Local OCR worker, engine and English language assets are ready.');
for(const folder of ['cmaps','standard_fonts','wasm'])await cp(path.join(root,'node_modules','pdfjs-dist',folder),path.join(root,'public','pdf',folder),{recursive:true});
console.log('Local PDF font, character map and decoding assets are ready.');