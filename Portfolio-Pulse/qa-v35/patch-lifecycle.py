from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = (root / 'assets/app-v34.js').read_text()


def replace(old, new, count=1):
    global source
    actual = source.count(old)
    if actual != count:
        raise SystemExit(f'Expected {count} matches, found {actual}: {old[:110]}')
    source = source.replace(old, new, count)


# Date inputs need both events. Browser date pickers and automation can update their
# visible value before React's change event is delivered.
replace('value:f,onChange:g=>m(g.target.value)',
        'value:f,onInput:g=>m(g.currentTarget.value),onChange:g=>m(g.target.value)')
replace('value:r,onChange:g=>u(g.target.value)',
        'value:r,onInput:g=>u(g.currentTarget.value),onChange:g=>u(g.target.value)')

# Quick updates use the same dependency shift as direct Gantt edits.
replace('y=e.stages.map((b,C)=>C===e.currentStage?{...b,status:c,forecastEnd:u||b.forecastEnd,comment:m}:b),S={...e,stages:y,manualRisk:h,nextAction:p,nextDue:N}',
        'y=Hd(e,e.currentStage,"forecast","end",re(u,o.forecastEnd)).stages.map((b,C)=>C===e.currentStage?{...b,status:c,comment:m}:b),S={...e,stages:y,forecastEnd:y.at(-1).forecastEnd,manualRisk:h,nextAction:p,nextDue:N}')
replace('let C=e.stages.map((L,q)=>q===e.currentStage?{...L,status:c,forecastEnd:u,actualEnd:c==="done"?u:L.actualEnd,comment:m}:L),k=e.currentStage;',
        'let C=y.map((L,q)=>q===e.currentStage?{...L,actualEnd:c==="done"?u:L.actualEnd}:L),k=e.currentStage;')

# Division is a project property, chosen explicitly. Country sets a useful default.
replace('jr=({client:e,name:t,country:a,coordinatorId:n,start:i,contractAmount:o,lang:s})=>',
        'jr=({client:e,name:t,country:a,division:ppDivision,coordinatorId:n,start:i,contractAmount:o,lang:s})=>')
replace('division:M.division,coordinatorId:M.id,baselineStart:i',
        'division:ppDivision||M.division,coordinatorId:M.id,baselineStart:i')
replace('[r,u]=(0,_.useState)("Kazakhstan"),f=ce.filter',
        '[r,u]=(0,_.useState)("Kazakhstan"),[ppDivision,setPpDivision]=(0,_.useState)("international"),f=ce.filter')
replace('country:r,coordinatorId:m,start:p,contractAmount:N,lang:e',
        'country:r,division:ppDivision,coordinatorId:m,start:p,contractAmount:N,lang:e', 2)
replace('value:r,onChange:S=>u(S.target.value),children:["United Arab Emirates"',
        'value:r,onChange:S=>{u(S.target.value),setPpDivision(["United States","Canada"].includes(S.target.value)?"americas":"international")},children:["United Arab Emirates"')
needle = '(0,l.jsxs)("label",{children:[(0,l.jsx)("span",{children:n.coordinatorLabel}),(0,l.jsx)("select",{"aria-label":n.coordinatorLabel'
insert = '(0,l.jsxs)("label",{children:[(0,l.jsx)("span",{children:e==="ru"?"Дивизион":"Division"}),(0,l.jsxs)("select",{"aria-label":e==="ru"?"Дивизион":"Division",value:ppDivision,onChange:S=>setPpDivision(S.target.value),children:["international","americas","advisory"].map(S=>(0,l.jsx)("option",{value:S,children:Q[e][S]},S))})]}),'
replace(needle, insert + needle)

# A replacement must be assigned to the vacant stage, not silently to the first
# active stage. The pool now exposes the destination before its Add action.
replace('[u,f]=(0,_.useState)("all"),[m,d]=(0,_.useState)(!1),p=Kd(e)',
        '[u,f]=(0,_.useState)("all"),[ppStage,setPpStage]=(0,_.useState)(Math.max(0,e.currentStage)),[m,d]=(0,_.useState)(!1),p=Kd(e)')
replace('let C=Math.max(0,e.stages.findIndex(q=>q.status!=="done")),k=e.stages[C]||e.stages[0];',
        'let C=Math.min(ppStage,e.stages.length-1),k=e.stages[C]||e.stages[0];')
needle = '(0,l.jsxs)("select",{value:u,onChange:E=>f(E.target.value),children:[(0,l.jsx)("option",{value:"all",children:i.allRoles})'
insert = '(0,l.jsxs)("label",{children:[(0,l.jsx)("span",{children:a==="ru"?"Этап назначения":"Assign to stage"}),(0,l.jsx)("select",{"aria-label":a==="ru"?"Этап назначения":"Assign to stage",value:ppStage,onChange:E=>setPpStage(Number(E.target.value)),children:e.stages.map((E,b)=>(0,l.jsx)("option",{value:b,children:`${b+1}. ${Xt(E,a)}`},b))})]}),'
replace(needle, insert + needle)

(root / 'assets/app-v35.js').write_text(source)
