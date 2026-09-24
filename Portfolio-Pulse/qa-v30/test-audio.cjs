const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../assets/ai-client-v30.js','utf8');
const wait=()=>new Promise(r=>setTimeout(r,25));let count=0;
function fixture({delayed=false,denied=false}={}){
 const dom=new JSDOM('',{url:'https://pulse.test',runScripts:'dangerously'}),w=dom.window;let stopped=0,sent=0,recorder,resolvePermission;
 w.Blob=Blob;w.FormData=FormData;w.AbortSignal=AbortSignal;w.AbortController=AbortController;w.PP_API_CONFIG={baseUrl:'https://api.test'};
 const stream={getTracks:()=>[{stop:()=>stopped++}]};w.navigator.mediaDevices={getUserMedia:()=>denied?Promise.reject(Error('denied')):delayed?new Promise(r=>resolvePermission=r):Promise.resolve(stream)};
 w.MediaRecorder=class{static isTypeSupported(t){return t.includes('webm')}constructor(){recorder=this;this.state='inactive'}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['fixture'],{type:'audio/webm'})});this.onstop?.()}};
 w.fetch=async()=>{sent++;return {ok:true,json:async()=>({text:'В понедельник восемь часов'})}};w.eval(source);
 return {w,close:()=>w.close(),stopped:()=>stopped,sent:()=>sent,resolve:()=>resolvePermission(stream)};
}
(async()=>{
 let f=fixture(),texts=[],errors=[];const recording=f.w.PPAI.record({language:'ru',onText:t=>texts.push(t),onError:e=>errors.push(e),onStatus:()=>{}});await wait();recording.stop();await wait();assert.equal(f.sent(),1);assert.equal(f.stopped(),1);assert.equal(texts.length,1);assert.equal(errors.length,0);console.log('PASS recorded audio transcribes once and releases microphone');count++;f.close();
 f=fixture();texts=[];const cancelled=f.w.PPAI.record({language:'ru',onText:t=>texts.push(t),onError:e=>errors.push(e),onStatus:()=>{}});await wait();cancelled.cancel();await wait();assert.equal(f.sent(),0);assert.equal(texts.length,0);assert(f.stopped()>0);console.log('PASS cancel releases microphone and sends no audio');count++;f.close();
 f=fixture({delayed:true});const pending=f.w.PPAI.record({onText:()=>assert.fail('late text'),onError:()=>{},onStatus:()=>{}});pending.cancel();f.resolve();await wait();assert.equal(f.sent(),0);assert.equal(f.stopped(),1);console.log('PASS close during permission prompt cannot start a late recording');count++;f.close();
 f=fixture({denied:true});errors=[];f.w.PPAI.record({onText:()=>assert.fail('unexpected text'),onError:e=>errors.push(e),onStatus:()=>{}});await wait();assert.equal(errors[0].code,'microphone');assert.equal(f.sent(),0);console.log('PASS microphone denial provides a recoverable error');count++;f.close();console.log(`${count} MediaRecorder lifecycle checks passed (simulated)`);
})().catch(e=>{console.error(e);process.exitCode=1});
