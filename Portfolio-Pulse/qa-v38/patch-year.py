from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'assets/app-v36.js').read_text()
def rep(a,b,count=1):
 global s
 assert s.count(a)==count,(a[:120],s.count(a));s=s.replace(a,b,count)
# A coordinator with no assigned projects gets an empty scope, never an arbitrary slice.
rep('return ee.length?ee:z.slice(0,5)','return ee')
# Active contract outlook and historical receipts have different populations.
rep('Gr=e=>{let t=fn.map(c=>e.flatMap(r=>r.milestones)', 'Gr=(e,h=e,collect=e)=>{let t=fn.map(c=>h.flatMap(r=>r.milestones)')
rep('o=fn.map(c=>c<=n?a[fn.indexOf(c)]:e.flatMap(r=>r.milestones)', 'o=fn.map(c=>c<=n?a[fn.indexOf(c)]:collect.flatMap(r=>r.milestones)')
rep('a=fn.map(c=>e.flatMap(r=>r.milestones.flatMap(u=>u.transactions))','a=fn.map(c=>h.flatMap(r=>r.milestones.flatMap(u=>u.transactions))')
rep('function f9({projects:e,lang:t}){let a=(0,_.useMemo)(()=>Gr(e),[e])','function f9({projects:e,historicalProjects:ppHistory,collectionProjects:ppCollect,lang:t}){let a=(0,_.useMemo)(()=>Gr(e,ppHistory||e,ppCollect||e),[e,ppHistory,ppCollect])')
rep('function D9({projects:e,lang:t,role:a,onOpenProject:n,onPortfolioFilter:i,onOpenDivision:o,onOpenTeam:s}){let c=Q[t],r=e.flatMap(T=>T.milestones)', 'function D9({projects:e,historicalProjects:ppHistory,collectionProjects:ppCollect,lang:t,role:a,onOpenProject:n,onPortfolioFilter:i,onOpenDivision:o,onOpenTeam:s}){let c=Q[t],r=e.flatMap(T=>T.milestones),ppPast=(ppHistory||e).flatMap(T=>T.milestones),ppOpen=(ppCollect||e).flatMap(T=>T.milestones)')
rep('u=r.filter(T=>T.planReceiptDate<=Y)','u=ppPast.filter(T=>T.planReceiptDate<=Y)')
rep('m=r.filter(T=>T.expectedReceiptDate>=Y','m=ppOpen.filter(T=>T.expectedReceiptDate>=Y')
rep('p=r.filter(T=>T.expectedReceiptDate>=Y','p=ppOpen.filter(T=>T.expectedReceiptDate>=Y')
rep('f=r.flatMap(T=>T.transactions).filter(T=>T.date<=Y)','f=ppPast.flatMap(T=>T.transactions).filter(T=>T.date<=Y)')
rep('v=Gr(e),y=v.forecast','v=Gr(e,ppHistory||e,ppCollect||e),y=v.forecast')
rep('(0,l.jsx)(f9,{projects:e,lang:t})','(0,l.jsx)(f9,{projects:e,historicalProjects:ppHistory,collectionProjects:ppCollect,lang:t})')
rep('d6=()=>i==="workforce"', 'ppDivision=Object.values(Pr).find(p=>p.name===wa.division)?.division||"international",ppHistory=a==="division"?s.filter(z=>z.division===ppDivision):s,ppCollections=[...$t,...ppHistory.filter(z=>z.archived&&z.milestones.some(m=>m.invoiceDate&&Ce(m)>0)).map(z=>({...z,milestones:z.milestones.filter(m=>m.invoiceDate&&Ce(m)>0)}))],d6=()=>i==="workforce"')
rep('(0,l.jsx)(D9,{projects:$t,lang:e,role:a','(0,l.jsx)(D9,{projects:$t,historicalProjects:ppHistory,collectionProjects:ppCollections,lang:e,role:a')
rep('i==="payments"?(0,l.jsx)(H9,{projects:$t', 'i==="payments"?(0,l.jsx)(H9,{projects:ppCollections')
rep('(0,l.jsx)(L9,{projects:$t', '(0,l.jsx)(L9,{projects:ppCollections')
# Repeated client engagements need unique identity and visible sequential codes.
rep('function Q9({lang:e,onClose:t,onCreate:a})', 'function Q9({lang:e,projects:ppExisting,onClose:t,onCreate:a})')
rep('h=()=>a(jr({client:s,name:i,country:r,division:ppDivision,coordinatorId:m,start:p,contractAmount:N,lang:e}))', 'h=()=>a(ppUniqueDraft(jr({client:s,name:i,country:r,division:ppDivision,coordinatorId:m,start:p,contractAmount:N,lang:e}),ppExisting))')
rep('y=v?jr({client:s,name:i,country:r,division:ppDivision,coordinatorId:m,start:p,contractAmount:N,lang:e}):null', 'y=v?{...jr({client:s,name:i,country:r,division:ppDivision,coordinatorId:m,start:p,contractAmount:N,lang:e}),code:ppNextCode(ppExisting)}:null')
rep('(0,l.jsx)(Q9,{lang:e,onClose:', '(0,l.jsx)(Q9,{lang:e,projects:s,onClose:')
rep('function Q9({lang:e,projects:ppExisting', 'var ppNextCode=projects=>`PP-${Math.max(1000,...projects.map(p=>Number(p.code?.replace(/\\D/g,""))||0))+1}`,ppUniqueDraft=(draft,projects)=>{const id=`project-ui-${crypto.randomUUID()}`;return {...draft,id,code:ppNextCode(projects),stages:draft.stages.map((stage,i)=>({...stage,id:`${id}-s${i}`})),milestones:draft.milestones.map((milestone,i)=>({...milestone,id:`${id}-m${i}`}))}};function Q9({lang:e,projects:ppExisting')
# Contract lifecycle retains reason and audit when leaving and returning to the active book.
rep('function X9({project:e,lang:t,onClose:a,onConfirm:n}){let i=Q[t];', 'function X9({project:e,lang:t,onClose:a,onConfirm:n}){let i=Q[t],[ppOutcome,ppSetOutcome]=(0,_.useState)("completed"),[ppReason,ppSetReason]=(0,_.useState)("");')
rep(']}),(0,l.jsxs)("footer",{className:"modal-actions",children:[(0,l.jsx)("button",{className:"secondary-button",onClick:a,children:i.cancel}),(0,l.jsxs)("button",{className:"danger-button solid",onClick:n,children:[i.archiveConfirm," \\u201C",e.client,"\\u201D"]})]})]})}function Z9',
''']}),(0,l.jsxs)("div",{className:"archive-reason-fields",children:[(0,l.jsxs)("label",{children:[t==="ru"?"Исход контракта":"Contract outcome",(0,l.jsxs)("select",{value:ppOutcome,onChange:v=>ppSetOutcome(v.target.value),children:[(0,l.jsx)("option",{value:"completed",children:t==="ru"?"Завершён":"Completed"}),(0,l.jsx)("option",{value:"lost",children:t==="ru"?"Потерян / расторгнут":"Lost / terminated"}),(0,l.jsx)("option",{value:"paused",children:t==="ru"?"Приостановлен":"Paused"})]})]}),(0,l.jsxs)("label",{children:[t==="ru"?"Причина и дальнейшее действие":"Reason and next action",(0,l.jsx)("textarea",{value:ppReason,onChange:v=>ppSetReason(v.target.value),placeholder:t==="ru"?"Кратко: почему закрыт и что сделать дальше":"Why it left the portfolio and what follows",rows:3})]})]}),(0,l.jsxs)("footer",{className:"modal-actions",children:[(0,l.jsx)("button",{className:"secondary-button",onClick:a,children:i.cancel}),(0,l.jsxs)("button",{className:"danger-button solid",disabled:ppReason.trim().length<3,onClick:()=>n({outcome:ppOutcome,reason:ppReason.trim()}),children:[i.archiveConfirm," \\u201C",e.client,"\\u201D"]})]})]})}function Z9''')
rep('onConfirm:()=>Xl(vt)','onConfirm:info=>Xl({...vt,archiveOutcome:info.outcome,archiveReason:info.reason,archivedAt:Y,lifecycleEvents:[...(vt.lifecycleEvents||[]),{date:Y,type:info.outcome,reason:info.reason}]})')
rep('ee.id===z.id?{...ee,archived:!0}:ee','ee.id===z.id?{...ee,archiveOutcome:z.archiveOutcome,archiveReason:z.archiveReason,archivedAt:z.archivedAt,lifecycleEvents:z.lifecycleEvents,archived:!0}:ee')
rep('_a=z=>{c(Z=>Z.map(ee=>ee.id===z.id?{...ee,archived:!1}:ee))','_a=z=>{c(Z=>Z.map(ee=>ee.id===z.id?{...ee,archived:!1,archiveOutcome:void 0,archiveReason:void 0,lifecycleEvents:[...(ee.lifecycleEvents||[]),{date:Y,type:"restored",reason:""}]}:ee))')
rep('o.code," \\xB7 ",o.country]})]}),(0,l.jsx)("button",{className:"secondary-button",onClick:()=>n(o),children:i.restore})', 'o.code," \\xB7 ",o.country]}),o.archiveOutcome&&(0,l.jsx)("p",{children:`${o.archiveOutcome==="lost"?t==="ru"?"Потерян":"Lost":o.archiveOutcome==="paused"?t==="ru"?"Приостановлен":"Paused":t==="ru"?"Завершён":"Completed"} · ${o.archiveReason||""}`})]}),(0,l.jsx)("button",{className:"secondary-button",onClick:()=>n(o),children:i.restore})')
# A reset must also reset time, HR and rate data, after a clear warning.
rep('o6=()=>{let z=fs();c(z),x(!1),window.localStorage.removeItem("portfolio-pulse-v4")','o6=()=>{if(!window.confirm(e==="ru"?"Сбросить проекты, часы, ставки и HR-изменения на этом устройстве? Сначала экспортируйте нужные данные.":"Reset projects, time, rates and HR changes on this device? Export anything you need first."))return;let z=fs();window.PPWorkforce?.resetDemo?.(z),c(z),x(!1),window.localStorage.removeItem("portfolio-pulse-v4")')
(root/'assets/app-v38.js').write_text(s)
w=(root/'assets/workforce-v37.js').read_text()
a='window.PPWorkforce={openProfiles,exportData:'
b='window.PPWorkforce={openProfiles,resetDemo:projects=>{const context={...B(),projects};db=C.init(context);disk=JSON.stringify(db);localStorage.setItem(KEY,disk);draftKey="";drafts=[];dirty=false;undoStack=[];selectedProject="";renderToken="";renderAll()},exportData:'
assert w.count(a)==1;w=w.replace(a,b)
(root/'assets/workforce-v38.js').write_text(w)

# Historical entries stay readable; fresh time cannot be submitted to a lost/closed contract.
k=(root/'assets/workforce-core-v37.js').read_text()
a="e.projectId&&!scope(ctx,actor).some(p=>p.id===e.projectId)))err('permission')"
b="e.projectId&&(!scope(ctx,actor).some(p=>p.id===e.projectId)||e.status==='draft'&&ctx.projects.find(p=>p.id===e.projectId)?.archived)))err('permission')"
assert k.count(a)==1;k=k.replace(a,b)
(root/'assets/workforce-core-v38.js').write_text(k)
