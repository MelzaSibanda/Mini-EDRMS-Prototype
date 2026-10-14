import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir=new URL('../.qa/',import.meta.url);
await mkdir(dir,{recursive:true});
const output=new URL('enterprise.test.mjs',dir);
try {
 await build({entryPoints:[fileURLToPath(new URL('enterprise.test.jsx',import.meta.url))],bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',outfile:fileURLToPath(output),logLevel:'warning',define:{'import.meta.env.BASE_URL':'"/"'},plugins:[{name:'browser-worker-url',setup(build){build.onResolve({filter:/\?url$/},args=>({path:args.path,namespace:'worker-url'}));build.onLoad({filter:/.*/,namespace:'worker-url'},()=>({contents:'export default "/test-worker.mjs";',loader:'js'}));}}]});
 const result=spawnSync(process.execPath,['--test',fileURLToPath(output)],{stdio:'inherit',env:{...process.env,NODE_ENV:'production'}});process.exitCode=result.status??1;
} finally {await rm(output,{force:true});}