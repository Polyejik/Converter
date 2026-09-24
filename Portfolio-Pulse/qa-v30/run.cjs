const {spawnSync}=require('node:child_process'),path=require('node:path');
const suites=[['qa-v30/test-domain.cjs'],['qa-v27/test-secretary-v27.cjs'],['qa-v27/test-apply-v27.cjs'],['qa-v30/test-secretary-speech.cjs'],['qa-v30/test-workforce-speech.cjs'],['qa-v30/test-ui.cjs'],['qa-v30/test-flows.cjs'],['qa-v30/test-audio.cjs'],['--test','api/test/openai.test.mjs','api/test/worker.test.mjs']];
for(const args of suites){const result=spawnSync(process.execPath,args,{cwd:path.resolve(__dirname,'..'),stdio:'inherit'});if(result.status!==0)process.exit(result.status||1)}
console.log('All v30 regression, UI, audio and API suites passed.');
