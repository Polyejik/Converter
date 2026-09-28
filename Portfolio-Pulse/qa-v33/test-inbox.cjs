const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..'),errors=[];let serverUser='',project,mail,calls=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css-parsing')errors.push(e.message)});
const html=fs.readFileSync(base+'/preview-v33.html','utf8').replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(path.join(base,src.split('?')[0]),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
const dom=new JSDOM(html,{url:'https://pulse.test/Portfolio-Pulse/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.HTMLElement.prototype.scrollIntoView=function(){};
  w.AbortController=AbortController;w.AbortSignal=AbortSignal;
  w.fetch=async(url,init={})=>{const route=new URL(url).pathname;calls.push(route);const ok=data=>({ok:true,json:async()=>data});
    if(route==='/api/session')return ok({user:{id:serverUser,name:'Test CEO',role:'ceo'},aiConfigured:true,projects:[project]});
    if(route==='/api/inbox')return ok({mails:[mail],next:null});
    if(route.endsWith('/classify')){assert.equal(JSON.parse(init.body).version,mail.version);mail={...mail,version:mail.version+1,suggestion:{projectId:project.id,category:'risk',priority:'high',summary:'Source review',reason:'Context only',confidence:.84,match:'context',evidence:['<img src=x onerror=alert(1)>']}};return ok({mail})}
    if(route.endsWith('/confirm')){const body=JSON.parse(init.body);assert.equal(body.reviewed,true);assert.equal(body.projectId,project.id);mail={...mail,projectId:body.projectId,verified:true,status:'assigned',version:mail.version+1};return ok({mail})}
    if(route.endsWith('/unassign')){mail={...mail,projectId:'',verified:false,status:'review',version:mail.version+1};return ok({mail})}
    throw Error('Unexpected request '+route);
  };
}});
const w=dom.window,wait=()=>new Promise(r=>setTimeout(r,180));
(async()=>{await new Promise(r=>w.addEventListener('load',r));await new Promise(r=>setTimeout(r,800));serverUser=w.PPSecretaryBridge.user.id;project=w.PPSecretaryBridge.projects[0];mail={id:'00000000-0000-0000-0000-000000000001',sender:'source@example.com',subject:'Status request',body:'Client wrote <img src=x onerror=alert(1)> about the schedule.',date:'2026-09-28T10:00:00Z',source:'pasted',status:'review',projectId:'',verified:false,version:1,suggestion:null};
  w.PPAI.configure('https://api.test');const root=w.document.querySelector('#pp-secretary').shadowRoot;root.querySelector('#launch').click();root.querySelector('[data-view="mail"]').click();root.querySelector('#mail-sync').click();await wait();assert(root.querySelector('[data-mail-ai]'),JSON.stringify({calls,screen:root.textContent.slice(-1200)}));assert(!root.querySelector('#mailgroups img'));
  root.querySelector('[data-mail-ai]').click();await wait();const evidence=root.querySelector('.mail-evidence');assert(evidence);assert(evidence.textContent.includes('<img src=x onerror=alert(1)>'));assert(!evidence.querySelector('img'));assert.equal(root.querySelector('[data-mail-match]').value,project.id);console.log('PASS model evidence is visible and escaped before a project is confirmed');
  root.querySelector('[data-mail-confirm]').click();await wait();assert(root.querySelector('[data-mail-unassign]'));assert(mail.verified);root.querySelector('[data-mail-unassign]').click();await wait();assert(root.querySelector('[data-mail-match]'));assert(!mail.verified);assert.deepEqual(errors,[]);console.log('PASS server-backed classify, confirm and undo stay explicit and render without errors');
  assert.equal(calls.filter(x=>x.endsWith('/classify')).length,1);dom.window.close();
})().catch(e=>{console.error(e,errors);dom.window.close();process.exitCode=1});
