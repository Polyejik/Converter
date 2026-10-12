#!/usr/bin/env python3
"""Real Chromium UI regression checks; isolated browser storage, no repository data writes."""
import json, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parents[1]
CHROME='/home/hermes/.hermes/tools/chromium-1208/chrome-linux64/chrome'
URL=(BASE/'index.html').as_uri()
results=[]
def record(case, value):
 results.append({'case':case,'observed':value});print(json.dumps(results[-1],ensure_ascii=False),flush=True)
for size in ['1440,1000','390,844']:
 r=subprocess.run([CHROME,'--headless=new','--no-sandbox','--disable-gpu','--virtual-time-budget=15000','--window-size='+size,'--dump-dom',URL],capture_output=True,text=True)
 assert r.returncode==0 and 'pp-create-reason' not in r.stdout and 'brief-cash-line' in r.stdout
 record('CLI '+size,{'exit':r.returncode,'DOM_bytes':len(r.stdout.encode()),'role_label':'aria-label="Рабочая роль"' in r.stdout})
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=CHROME,args=['--no-sandbox','--disable-gpu'])
 for width,height in [(1440,1000),(390,844)]:
  ctx=browser.new_context(viewport={'width':width,'height':height});p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto(URL);p.wait_for_timeout(1300)
  def wait():p.wait_for_timeout(650)
  def nav(name):p.evaluate('(name)=>PPSecretaryBridge.navigate(name)',name);wait()
  def lang(name):p.get_by_role('button',name=name,exact=True).click();wait()
  def shadow_text():return p.locator('#pp-workforce-mount').evaluate('(e)=>e.shadowRoot.querySelector("#content").innerText')
  assert p.locator('.role-control select').get_attribute('aria-label')=='Рабочая роль'
  assert p.evaluate('PPSecretaryBridge.projects.every(p=>["international","americas","advisory"].includes(p.division))');assert p.evaluate('PPSecretaryBridge.projects[0].milestones.map(m=>m.name)')==['Mobilisation','Technical delivery','Final delivery']
  before=p.locator('.brief-cash-line').inner_text();assert '$1,51 млн.' in before
  assert 'Техническая работа' in p.locator('body').inner_text() and 'Финальная сдача' in p.locator('body').inner_text()
  record(f'{width} RU CEO / milestones',before)
  # Change a real open milestone via the same bridge used by project editors.
  changed=p.evaluate('''()=>{const b=PPSecretaryBridge,p=b.projects.find(p=>p.milestones.some(m=>m.expectedReceiptDate>"2026-07-31"&&m.expectedReceiptDate<="2026-08-14"&&m.amount>(m.transactions||[]).reduce((s,t)=>s+(t.type==="receipt"?t.amount:0),0))),copy=JSON.parse(JSON.stringify(p)),m=copy.milestones.find(m=>m.expectedReceiptDate>"2026-07-31"&&m.expectedReceiptDate<="2026-08-14");m.amount+=100000;return b.commit(p.id,JSON.stringify(p),copy)}''');assert changed;wait()
  after=p.locator('.brief-cash-line').inner_text();assert after!=before and '$1,61 млн.' in after;record(f'{width} CEO +100000 USD',after)
  lang('EN');enbrief=p.locator('.brief-cash-line').inner_text();assert 'Expected in 14 days after July 31' in enbrief
  assert p.locator('.role-control select').get_attribute('aria-label')=='Working role'
  assert all(name in p.locator('body').inner_text().casefold() for name in ['international','north america','advisory'])
  assert 'Technical delivery' in p.locator('body').inner_text() and 'Final delivery' in p.locator('body').inner_text();record(f'{width} EN',{'brief':enbrief,'select':p.locator('.role-control select').get_attribute('aria-label')})
  lang('RU')
  p.get_by_role('button',name='Новый проект',exact=True).click();wait();d=p.get_by_role('dialog');submit=d.locator('button[type=submit]')
  assert submit.is_disabled();reason=d.locator('#pp-create-reason').inner_text();assert 'Название проекта' in reason and 'Клиент' in reason;record(f'{width} missing fields',reason)
  d.locator('#pp-create-reason').scroll_into_view_if_needed();box=d.locator('#pp-create-reason').bounding_box();assert box['x']>=0 and box['x']+box['width']<=width and box['y']>=0 and box['y']+box['height']<=height;p.screenshot(path=f'/tmp/ui-create-v38-{width}.png');record(f'{width} reason visible',box)
  d.get_by_role('textbox',name='Название проекта',exact=True).fill('UI check');d.get_by_role('textbox',name='Клиент',exact=True).fill('UI check client')
  amount=d.locator('input[type=number]');amount.fill('999');wait();assert submit.is_disabled();record(f'{width} contract 999',d.locator('#pp-create-reason').inner_text())
  amount.fill('1000');wait();assert submit.is_enabled();record(f'{width} contract 1000',{'disabled':submit.is_disabled()})
  amount.fill('1500');wait();assert submit.is_enabled() and amount.evaluate('(e)=>e.validity.valid');record(f'{width} contract 1500',{'disabled':submit.is_disabled(),'valid':True})
  d.locator('input[type=date]').fill('');wait();assert submit.is_disabled();record(f'{width} missing date',d.locator('#pp-create-reason').inner_text());d.get_by_role('button',name='Отмена',exact=True).click();wait()
  nav('workforce');p.locator('[data-view=week]').click();wait()
  picker=p.locator('#project-picker');assert picker.count()==1
  full=p.locator('#project-options option').first.get_attribute('value');client=p.evaluate('PPSecretaryBridge.projects.find(p=>p.code==="PP-001").client')
  for term in [full,'PP-001',client]:
   count=p.locator('.main-row').count();picker.fill(term);p.locator('#add-entry').click();wait();assert p.locator('.main-row').count()==count+1;record(f'{width} add {term}',{'rows_before':count,'rows_after':count+1,'projectId':p.locator('.main-row select[data-field=projectId]').last.input_value()})
  # Make another active project share the exact client in this isolated browser context.
  assert p.evaluate('''client=>{let b=PPSecretaryBridge,orig=b.projects.find(p=>p.code!=="PP-001"&&!p.archived),copy=JSON.parse(JSON.stringify(orig));copy.client=client;return b.commit(orig.id,JSON.stringify(orig),copy)}''',client);wait()
  count=p.locator('.main-row').count();p.locator('#project-picker').fill(client);p.locator('#add-entry').click();wait();msg=p.locator('#pp-workforce-overlays .toast').inner_text();assert 'Найдено несколько проектов' in msg and 'PP-001' in msg and p.locator('.main-row').count()==count;record(f'{width} ambiguous',msg)
  p.locator('[data-view=economics]').click();wait();assert 'Доля оплачиваемых часов' in shadow_text();record(f'{width} economics RU','Доля оплачиваемых часов')
  lang('EN');assert 'Billable share' in shadow_text();record(f'{width} economics EN','Billable share');lang('RU')
  nav('personnel');wait();assert p.locator('#pp-personnel-mount').count();assert 'Оплачиваемые часы / стоимость' in p.locator('#pp-personnel-mount').evaluate('(e)=>e.shadowRoot.textContent');record(f'{width} personnel RU','Оплачиваемые часы / стоимость')
  hrtext=p.locator('#pp-personnel-mount').evaluate('(e)=>Array.from(e.shadowRoot.children).filter(x=>x.tagName!=="STYLE").map(x=>x.innerText).join("\\n")');assert all(x in hrtext for x in ['Международный','Америки','Консультационный']);record(f'{width} division fallback RU',['Международный','Америки','Консультационный'])
  lang('EN');assert 'Billable h / cost' in p.locator('#pp-personnel-mount').evaluate('(e)=>e.shadowRoot.textContent');record(f'{width} personnel EN','Billable h / cost');lang('RU')
  # Controlled loads on personal capacity 90 (not 100): reserve, exact 85/110, overload.
  people=p.evaluate('PPSecretaryBridge.team.slice(0,4).map(m=>{m.capacity=90;return {id:m.id,name:m.name,capacity:m.capacity}})')
  ratios=[.84,.85,1.10,1.11]
  # Eliminate existing assignments, install four controlled active assignments.
  for id in p.evaluate('PPSecretaryBridge.projects.map(p=>p.id)'):
   assert p.evaluate('''arg=>{let b=PPSecretaryBridge,orig=b.projects.find(p=>p.id===arg.id),copy=JSON.parse(JSON.stringify(orig));copy.stages.forEach(s=>s.assignments=[]);if(orig.code==="PP-001"){copy.currentStage=0;copy.stages[0].status="inProgress";copy.stages[0].assignments=arg.people.map((m,i)=>({memberId:m.id,load:Math.round(m.capacity*arg.ratios[i]*100)/100,plannedDays:5,actualDays:0,remainingDays:5,startDate:copy.stages[0].forecastStart,endDate:copy.stages[0].forecastEnd,linkedStageId:copy.stages[0].id}));}return b.commit(orig.id,JSON.stringify(orig),copy)}''',{'id':id,'people':people,'ratios':ratios}), id
   p.wait_for_timeout(80)
  wait();nav('personnel')
  show=p.locator('.personnel-more');
  if show.count():show.click();wait()
  expected=['Есть резерв','Полная загрузка','Полная загрузка','Перегрузка']
  for m,r,label in zip(people,ratios,expected):
   row=p.locator('.personnel-table article').filter(has_text=m['name']);text=row.inner_text();assert label in text;record(f'{width} personal capacity {r*100:g}%',{'capacity':m['capacity'],'load':m['capacity']*r,'text':text})
  cards=p.locator('.personnel-kpis article');summary=[c.inner_text() for c in cards.all()];assert cards.nth(3).locator('strong').inner_text()=='1';assert cards.nth(2).locator('strong').inner_text()==str(len(p.evaluate('PPSecretaryBridge.team'))-3);record(f'{width} summary',summary)
  # Real ledger bookings and C.resourceRows, including a personal 20 h weekly capacity.
  p.evaluate('''people=>{const b=PPSecretaryBridge,C=PPWorkforceCore,db=C.init(b),actor=C.resolveActor(db,b),week="2026-07-27";for(const m of C.profiles(b))for(const project of b.projects)if(C.active(project))C.saveBooking(db,{memberId:m.id,projectId:project.id,week,hours:0},b,actor);people.forEach((m,i)=>{db.capacities[m.id]=20;C.saveBooking(db,{memberId:m.id,projectId:b.projects[0].id,week,hours:[16.75,17,22,22.25][i]},b,actor)});localStorage.setItem("pp-workforce-v28",JSON.stringify(db))}''',people)
  p.reload();p.wait_for_timeout(1300);nav('workforce');p.locator('[data-view=resources]').click();wait();p.locator('#week-date').fill('2026-07-27');p.locator('#week-date').dispatch_event('change');wait()
  for m,label in zip(people,expected):
   row=p.locator('.resource').filter(has_text=m['name']);text=row.inner_text();assert label in text;record(f'{width} weekly capacity '+m['name'],text)
  summary=p.locator('#pp-workforce-mount .kpis').inner_text();assert 'Перегружены\n1' in summary;record(f'{width} weekly summary',summary)
  assert errors==[],errors;record(f'{width} JS errors',errors)
  p.screenshot(path=f'/tmp/ui-fixes-v38-{width}.png',full_page=True);ctx.close()
 browser.close()
(BASE/'tools/ui-fixes-v38-observations.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('PASS real Chromium UI checks at both viewports')
