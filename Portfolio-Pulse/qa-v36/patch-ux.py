from pathlib import Path

root=Path(__file__).resolve().parents[1]
s=(root/'assets/app-v35.js').read_text()

def replace(old,new,count=1):
 global s
 assert s.count(old)==count,(old[:120],s.count(old))
 s=s.replace(old,new,count)

# Coordinators normally revise the forecast. A baseline change remains possible,
# but entering the planning mode never silently selects the contractual plan.
replace('[S,x]=(0,_.useState)("baseline")','[S,x]=(0,_.useState)("forecast")')
replace('y(!0),x("baseline"),p(null),h(null)','y(!0),x("forecast"),p(null),h(null)')
replace('y(!1),x("baseline"),D([]),E("")','y(!1),x("forecast"),D([]),E("")')
replace('onClick:()=>x("baseline"),children:[(0,l.jsx)("i",{className:"baseline-dot"}),C.baseline]}),(0,l.jsxs)("button",{role:"tab"',
        'onClick:()=>x("baseline"),children:[(0,l.jsx)("i",{className:"baseline-dot"}),C.baseline]}),(0,l.jsxs)("button",{role:"tab"')
needle='(0,l.jsxs)("div",{className:"schedule-edit-actions",children:'
warning='S==="baseline"&&(0,l.jsx)("span",{className:"baseline-caution",role:"status",children:a==="ru"?"Вы меняете исходный план. Используйте прогноз для рабочих переносов.":"You are changing the original plan. Use Forecast for delivery changes."}),'
replace(needle,warning+needle)

# Finance sees a stage delay while entering a revised receipt date. This is a
# prompt to review the money forecast, not an automatic edit of the contract.
needle='(0,l.jsxs)("div",{className:"form-grid",children:[(0,l.jsxs)("label",{children:[(0,l.jsx)("span",{children:o.invoiceNo})'
notice='re(e.stages[t.stageIndex]?.forecastEnd,e.stages[t.stageIndex]?.planEnd)>0&&(0,l.jsx)("div",{className:"payment-stage-alert",role:"status",children:a==="ru"?`Связанный этап сдвинут на ${re(e.stages[t.stageIndex].forecastEnd,e.stages[t.stageIndex].planEnd)} дн. Проверьте ожидаемую оплату.`:`Linked stage is ${re(e.stages[t.stageIndex].forecastEnd,e.stages[t.stageIndex].planEnd)} days late. Review expected receipt.`}),'
replace(needle,notice+needle)

# A single, unworked assignment can move to a different stage without being
# removed and recreated. Historical actual days or multiple assignments stay put.
replace('allocation:q,linked:T}}),v=E=>', 'allocation:q,linked:T,single:C.length===1&&C[0].assignment.actualDays===0}}),v=E=>')
needle='S=E=>n({...e,stages:e.stages.map(b=>({...b,assignments:b.assignments.filter(C=>C.memberId!==E)})),lastUpdated:Y}),x=(E,b,C,k,L)=>'
move='PpMove=(memberId,targetIndex)=>{let sourceIndex=e.stages.findIndex(stage=>stage.assignments.some(assignment=>assignment.memberId===memberId));if(sourceIndex<0||sourceIndex===targetIndex)return;let original=e.stages[sourceIndex].assignments.find(assignment=>assignment.memberId===memberId),target=e.stages[targetIndex];if(!original||!target||original.actualDays>0||e.stages.flatMap(stage=>stage.assignments).filter(assignment=>assignment.memberId===memberId).length!==1)return;let days=Math.max(1,Math.round(re(target.forecastEnd,target.forecastStart)*original.load/100)),moved={...original,linkedStageId:target.id,startDate:target.forecastStart,endDate:target.forecastEnd,plannedDays:days,remainingDays:days};n({...e,stages:e.stages.map((stage,index)=>index===sourceIndex?{...stage,assignments:stage.assignments.filter(assignment=>assignment.memberId!==memberId)}:index===targetIndex?{...stage,assignments:[...stage.assignments,moved]}:stage),lastUpdated:Y})},'
replace(needle,needle.replace('x=(E,b,C,k,L)=>',move+'x=(E,b,C,k,L)=>'))
replace('h.map(({member:E,start:b,end:C,allocation:k,linked:L})=>',
        'h.map(({member:E,start:b,end:C,allocation:k,linked:L,single:ppSingle})=>')
needle='(0,l.jsxs)("span",{children:[Fe[a][E.discipline]," \\xB7 ",E.office]})]})'
# The bundle stores the middle dot as an escaped JavaScript string.
assert needle in s
replace(needle,'(0,l.jsxs)("span",{children:[Fe[a][E.discipline]," \\xB7 ",E.office]}),ppSingle&&(0,l.jsx)("select",{className:"assignment-stage-select","aria-label":`${a==="ru"?"Этап":"Stage"}: ${E.name}`,value:e.stages.findIndex(stage=>stage.id===L?.id),onChange:event=>PpMove(E.id,Number(event.target.value)),children:e.stages.map((stage,index)=>(0,l.jsx)("option",{value:index,children:`${index+1}. ${Xt(stage,a)}`},stage.id))})]})')

(root/'assets/app-v36.js').write_text(s)
