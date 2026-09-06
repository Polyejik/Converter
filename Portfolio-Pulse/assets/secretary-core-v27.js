/* Deterministic command engine: truthful demo capabilities, structured changes, no network. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),clean=s=>String(s||'').toLowerCase().replace(/ё/g,'е').trim();
const statuses={active:['В работе','In progress'],waiting:['Ждём клиента','Waiting on client'],paused:['Приостановлен','On hold'],completed:['Работы завершены','Delivery completed']};
const stageNames={data:['Сбор данных','Data collection'],geology:['Геология','Geology'],recoverables:['Извлекаемые','Recoverables'],economics:['Экономика','Economics'],draft:['Предварительный отчёт','Preliminary report'],final:['Финальный отчёт','Final report']};
function label(key,en=false){return (statuses[key]||stageNames[key]||[key,key])[en?1:0]}
function match(text,ps){
 const codes=[...new Set((text.match(/\bPP[-\s]?\d{3,4}\b/gi)||[]).map(x=>x.toUpperCase().replace(/^PP\s?/,'PP-').replace('--','-')))];
 if(codes.length>1)return {reason:'multiple',candidates:ps.filter(p=>codes.includes(p.code.toUpperCase()))};
 if(codes.length){let p=ps.find(p=>p.code.toUpperCase()===codes[0]);return {project:p,reason:p?'code':'unknown',candidates:p?[p]:[]}}
 const t=clean(text),hits=ps.filter(p=>[p.client,p.name].some(v=>v&&v.length>3&&t.includes(clean(v))));return {project:hits.length===1?hits[0]:null,reason:hits.length===1?'context':hits.length?'multiple':'none',candidates:hits};
}
function parseDate(text){let m=text.match(/\b(20\d{2})-(\d\d)-(\d\d)\b/);if(m)return validDate(m[0]);m=text.match(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/);if(m)return validDate(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);const months=['январ','феврал','март','апрел','мая','июн','июл','август','сентябр','октябр','ноябр','декабр'];m=clean(text).match(/(\d{1,2})\s+([а-я]+)\s+(20\d{2})/);if(m){const n=months.findIndex(x=>m[2].startsWith(x));if(n>=0)return validDate(`${m[3]}-${String(n+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`)}return ''}
function validDate(v){const d=new Date(v+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===v?v:''}
function createFields(text,prev={}){
 const out={...prev};let m=text.match(/[«“"]([^»”"]+)[»”"]/);if(m)out.name=m[1].trim();
 m=text.match(/(?:название|name|title)\s*[:=]\s*([^;\n]+)/i);if(m)out.name=m[1].trim();
 m=text.match(/(?:для клиента|клиент(?:а)?|client)\s*[:=]?\s*([^;,\n]+)/i);if(m)out.client=m[1].trim();
 m=text.match(/(?:контракт|бюджет|budget|contract|сумма)\s*[:=]?\s*\$?\s*(\d[\d\s]*(?:[.,]\d+)?)\s*(млн|тыс|million|thousand|k\b|m\b)?/i);
 if(m){out.amount=Number(m[1].replace(/\s/g,'').replace(',','.'))*(/млн|million|^m$/i.test(m[2]||'')?1e6:/тыс|thousand|k/i.test(m[2]||'')?1e3:1);out.currency=/руб|rub|₽/i.test(text)?'RUB':/eur|евро|€/i.test(text)?'EUR':'USD'}
 const countries=[['казахстан|kazakhstan','Kazakhstan'],['азербайджан|azerbaijan','Azerbaijan'],['сша|united states|usa|texas','United States'],['оман|oman','Oman'],['оаэ|uae|emirates','United Arab Emirates'],['алжир|algeria','Algeria'],['канада|canada','Canada'],['россия|russia','Russia'],['украина|ukraine','Ukraine'],['египет|egypt','Egypt'],['норвегия|norway','Norway'],['румыния|romania','Romania']];for(const [re,c]of countries)if(new RegExp(re,'i').test(text))out.country=c;
 const date=parseDate(text);if(date)out.start=date;return out;
}
function route(text,pending){const t=clean(text);
 if(/сними (?:алерт|сигнал)|снять (?:алерт|сигнал)|resolve alert|clear alert/.test(t))return 'resolveAlert';
 if(isOperationalUpdate(t))return 'note';
 if(/^(отмена|отмени|cancel|undo|назад|верни назад)[.! ]*$/.test(t))return 'undo';
 if(/(?:не\s+)(?:удал|архив|закры|созд|заверш|меня)|do not|don't/.test(t))return 'note';
 if(/если|\bif\b|возмож/.test(t)&&/удал|архив|закр|заверш|приостанов|delete|archive|complete|close/.test(t))return 'note';
 if(/(?:созда[йтьм]|создать|добав[ьи]).*проект|новый проект|create.*project|add.*project/.test(t))return 'create';
 if(/восстанов|верни.*(?:проект|архив)|restore/.test(t))return 'restore';
 if(/удали|удалить|убери.*проект|архивиру|delete|archive/.test(t))return 'archive';
 if(/что измен|изменения|с последн|what.*chang|recent changes/.test(t))return 'changes';
 if(/(?:подготов|состав|draft|prepare).*(?:письм|email|напоминан)/.test(t))return 'emailDraft';
 if(/кто свобод|кого.*подключ|где.*люд|не хватает людей|загрузк|ресурс|capacity|overload|available.*(?:people|engineer)|staffing/.test(t)&&!/нужно|нужны|need|увелич|добав/.test(t))return 'capacity';
 if(/(?:покажи|какие|сколько|где|show|which|how much).*(?:платеж|поступлен|ден[ье]г|cash|payment|receiv)|деньги под риском|cash at risk/.test(t))return 'cash';
 if(/(?:что|какие).*(?:решени|важн|внимани)|приоритет|бриф|сводк|утренн|brief|priorit|decision|attention|risk.*portfolio/.test(t))return 'brief';
 if(/(?:заверш[еёе]н|заверши|закрой|закрыть|completed|complete project|close project|close.*job)/.test(t)&&!/(если|if |потом|later)/.test(t)&&(!/этап|оценк|геолог|отчет|stage|assessment|geology|report/.test(t)||/заверши.*проект|закрой.*проект|проект\s+заверш|complete project|project completed|close project/.test(t)))return 'status';
 if(/статус|приостанов|постав.*пауз|в работе|возобнов|status|on hold|resume|ждем|ожидаем|waiting|await/.test(t))return 'status';
 if(/открой|открыть|покажи проект|open project/.test(t))return 'open';
 if(pending?.kind==='create'&&pending.question)return 'create';return 'note';
}
function statusOf(text){const t=clean(text);if(/заверш|закры|completed|complete|close/.test(t))return 'completed';if(/приостанов|пауз|on hold|paused/.test(t))return 'paused';if(/ждем|ожида|waiting|await/.test(t))return 'waiting';if(/в работе|возобнов|актив|in progress|active|resume/.test(t))return 'active';return ''}
function operationalPatch(p,status,date,en=false){
 const patch={secretaryStatus:status,lastUpdated:date};
 if(status==='completed'){patch.stages=p.stages.map(s=>({...s,status:'done',actualEnd:s.actualEnd||date}));patch.currentStage=Math.max(0,p.stages.length-1);patch.nextAction=en?'Review final documents and outstanding client payments.':'Проверить финальные документы и остаток расчётов с клиентом.'}
 if(status!=='completed'&&p.secretaryStatus==='completed')return null;
 return patch;
}
function isOperationalUpdate(t){return /(?:задерж|delay).*(?:данн|data)|(?:данн|data).*(?:задерж|delay)|не получ.*(?:платеж|оплат)|(?:платеж|оплат).*(?:не получ|задерж)|unpaid|payment.*(?:not received|overdue)|not received.*payment|не отправля|не передаем|withhold|not sending|вопрос.*(?:division|дивизион)|решени.*(?:эконом|продолж)|если.*(?:дедлайн|срок|deadline|геолог)/.test(t)}
function duration(text){const t=clean(text),m=t.match(/(?:(\d+|две|два|одну|одна|один|три|two|one|three)\s*)?(недел\w*|дн\w*|день|дня|weeks?\b|days?\b)/);if(!m)return null;const num=Number(m[1])||({две:2,два:2,одну:1,одна:1,один:1,три:3,two:2,one:1,three:3}[m[1]])||1;return {days:num*(/недел|week/.test(m[2])?7:1),text:m[0]}}
function signalDetails(text,en=false,date){const t=clean(text),pick=(r,e)=>en?e:r,rows=[],tasks=[],factsPart=t.split(/если|\bif\b/)[0];
 const conditional=/если|\bif\b|возмож|\bmay\b/.test(t),dataDelay=/данн|\bdata\b/.test(factsPart)&&/задерж|delay/.test(factsPart)&&!/не задерж|no delay/.test(factsPart),unpaid=/не получ.*(?:платеж|оплат)|(?:платеж|оплат).*(?:не получ|задерж)|unpaid|payment.*(?:not received|overdue)|not received.*payment/.test(t),held=/не отправля|не передаем|withhold|not sending/.test(t),decision=/division manager|дивизион|вопрос.*продолж|решени.*(?:продолж|эконом)|whether.*(?:continue|proceed)/.test(t),schedule=conditional&&/срок|дедлайн|deadline|геолог|geolog/.test(t);
 const delay=dataDelay?duration(factsPart):null,after=t.match(/через\s+([^,.;]+)|(?:within|in)\s+((?:\d+|one|two)\s+weeks?)/),wait=after?duration(after[1]||after[2]):null;let reviewDate=null;
 if(wait&&date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+wait.days);if(Number.isFinite(+d))reviewDate=d.toISOString().slice(0,10)}
 if(dataDelay){rows.push({type:'fact',text:pick(`Клиент задержал передачу данных${delay?' на '+delay.days+' дн':''}.`,`Client data delivery is delayed${delay?' by '+delay.days+' days':''}.`)});tasks.push(pick('Координатору: получить от клиента подтверждённую дату передачи данных.','Coordinator: obtain a confirmed data delivery date from the client.'))}
 if(schedule)rows.push({type:'risk',text:pick(`Если данные не поступят${reviewDate?' до '+reviewDate:' в оговорённый срок'}, потребуется пересмотреть ${/геолог|geolog/.test(t)?'срок геологии':'сроки проекта'}. Это условный риск, не утверждённый перенос.`,`If data does not arrive${reviewDate?' by '+reviewDate:' in time'}, ${/геолог|geolog/.test(t)?'geology timing':'project deadlines'} may need revision. This is a conditional risk, not an approved schedule change.`)});
 if(unpaid){rows.push({type:'fact',text:pick(`Сообщается о неполученном платеже${/data collection|сбор.*данн/.test(t)?' за этап Data collection':''}. Финансовый учёт требует сверки.`,`Payment is reported as not received${/data collection|сбор.*данн/.test(t)?' for Data collection':''}. Reconcile with the payment ledger.`)});rows.push({type:'risk',text:pick('Продолжение работ до оплаты увеличивает неоплаченный объём; задержка выдачи результата может повлиять на график.','Continuing before payment increases unpaid work; withholding delivery may affect the schedule.')});tasks.push(pick('Контрактнику и бухгалтерии: сверить счёт, поступления и условия выдачи результатов.','Contracts and accounting: reconcile the invoice, receipts and delivery terms.'))}
 if(held)rows.push({type:'alert',text:pick(`Выдача ${/тик|извлекаем|recoverab/.test(t)?'предварительной оценки ТИК':'результатов'} приостановлена со слов автора${/готов|ready/.test(t)?'; результаты подготовлены':''}. Это не отметка об отправке.`,`Delivery of ${/тик|извлекаем|recoverab/.test(t)?'preliminary recoverables results':'results'} is reported as on hold${/готов|ready/.test(t)?'; results are ready':''}. Not marked as sent.`)});
 if(decision&&(unpaid||held||/эконом|econom/.test(t))){rows.push({type:'decision',text:pick('Division manager: продолжать экономическую оценку до получения оплаты или ожидать платёж? Решение ещё не принято.','Division manager: continue economics before payment, or wait for payment? No decision has been made.')});tasks.push(pick('Руководителю дивизиона: согласовать продолжение экономики или паузу; оценить влияние на срок и неоплаченные трудозатраты.','Division manager: approve economics continuation or a pause; assess timing and unpaid effort.'))}
 const active=dataDelay||unpaid||held||schedule||decision&&rows.length>0;
 if(active&&!tasks.length)tasks.push(pick('Координатору: уточнить условие снятия блокировки и подтвердить следующий шаг.','Coordinator: clarify the release condition and confirm the next action.'));
 return {rows,tasks,signal:active?{active:true,title:unpaid?pick('Оплата и выдача результатов требуют решения','Payment and delivery need a decision'):pick('Задержка данных · контроль сроков','Data delay · schedule watch'),severity:'watch',delayDays:delay?.days||null,reviewDate,ownerRole:decision?'division':'coordinator',unpaid,deliveryHold:held,decisionRequired:rows.some(r=>r.type==='decision'),unchanged:pick('График, baseline, статусы этапов, суммы и транзакции не меняются.','Schedule, baseline, stage statuses, amounts and transactions stay unchanged.')}:null};
}
function facts(text,en=false,date){const t=clean(text),pick=(r,e)=>en?e:r;const structured=signalDetails(text,en,date),rows=structured.rows,tasks=structured.tasks;
 if(/инженер|engineer/.test(t)&&/больше|дополн|добав|нужн|more|extra|need/.test(t)){let count=t.match(/(\d+)\s*(?:дополнительн\w*\s*)?(?:инженер|engineer)/);rows.push({type:'decision',text:pick(`Ресурсы: ${count?count[1]+' дополнительных инженера':'нужны дополнительные инженеры'} для сохранения срока.`,`Resources: ${count?count[1]+' additional engineers':'additional engineers needed'} to protect the deadline.`)});tasks.push(pick('Руководителю дивизиона: проверить доступную загрузку и согласовать состав команды.','Division manager: check capacity and approve the team.'))}
 if(/объем|scope/.test(t)&&/увелич|дополн|больше|more|increase|extra/.test(t)){rows.push({type:'commercial',text:pick('Расширение объёма: требуется коммерческое решение; бюджет не изменён.','Scope increase: commercial decision required; budget unchanged.')});tasks.push(pick('Оценить дополнительные трудозатраты и согласовать change order.','Estimate additional effort and approve a change order.'))}
 const percent=t.match(/(\d{1,3})\s*(?:%|процент|percent)/);if(percent)rows.push({type:+percent[1]<=100?'fact':'question',text:pick(`Заявленная готовность: ${percent[1]}%. ${+percent[1]>100?'Уточните значение от 0 до 100.':'Этап необходимо указать явно.'}`,`Reported progress: ${percent[1]}%. ${+percent[1]>100?'Please specify 0–100.':'Identify the stage explicitly.'}`)});
 if(/(?:отправили|отправлен|направлен|\bsent\b)/.test(t)&&!/не отправ|не направ|not sent|haven.t sent/.test(t))rows.push({type:'fact',text:pick('Результат направлен клиенту.','Deliverable sent to the client.')});
 if(!rows.length)rows.push({type:'note',text:pick('Сохраню сообщение в истории проекта без изменения сроков и финансов.','Save this message to the project record; dates and finances stay unchanged.')});return {rows,tasks,signal:structured.signal};
}
function parse(text,state,context={}){
 const en=state.lang==='en',pick=(r,e)=>en?e:r,kind=route(text,context.pending),result={kind,text,projectId:'',rows:[],tasks:[]};
 if(kind==='create'){
 let fields=createFields(text,context.pending?.kind==='create'?context.pending.fields:{});const missing=['name','client','amount','country','start'].filter(k=>!fields[k]||k==='amount'&&fields[k]<=0);
 return {...result,fields,missing,question:missing.length?pick('Уточните: ','Please provide: ')+missing.map(k=>({name:pick('название в кавычках','quoted project title'),client:pick('клиент','client'),amount:pick('контракт в USD','contract in USD'),country:pick('страна','country'),start:pick('дата старта','start date')}[k])).join(', '):fields.currency!=='USD'?pick('В текущей модели контракты ведутся в USD. Укажите сумму в USD.','This portfolio uses USD. Please provide the contract value in USD.'):''};
 }
 if(['brief','cash','capacity','changes','undo'].includes(kind))return result;
 const m=match(text,state.projects);let p=m.project;
 if(!p&&context.confirmedProject)p=state.projects.find(p=>p.id===context.confirmedProject);
 if(m.reason==='none'&&context.selected)p=state.projects.find(p=>p.id===context.selected);
 if(!p)return {...result,...(kind==='note'?facts(text,en,context.today||state.date):{}),question:pick(m.reason==='multiple'?'Упомянуто несколько проектов. Выберите один для этого действия.':'Выберите проект ниже или укажите его код PP-…; до этого ничего не будет записано.',m.reason==='multiple'?'Several projects match. Select one for this action.':'Select the project below or specify its PP-… code. Nothing will be saved before that.'),candidates:m.candidates};
 result.projectId=p.id;result.project=p;result.expected=JSON.stringify(p);
 if(p.archived&&kind!=='restore'&&kind!=='open')return {...result,question:pick('Проект в архиве. Сначала восстановите его.','Project is archived. Restore it first.')};
 if(['archive','restore','open','emailDraft','resolveAlert'].includes(kind))return result;
 if(kind==='status'){let status=statusOf(text);return {...result,status,question:status?'':pick('Какой статус: в работе, ждём клиента, приостановлен или завершён?','Which status: in progress, waiting on client, on hold, or completed?')}}
 const analysis=facts(text,en,context.today||state.date);if(analysis.signal){const owner=analysis.signal.ownerRole==='division'?state.managers?.[p.division]:state.team.find(m=>m.id===p.coordinatorId);analysis.signal.ownerName=owner?.name||pick(analysis.signal.ownerRole==='division'?'Руководитель дивизиона':'Координатор',analysis.signal.ownerRole==='division'?'Division manager':'Coordinator');analysis.signal.rows=analysis.rows;analysis.signal.tasks=analysis.tasks;}
 return {...result,...analysis};
}
function paymentRows(state){return state.projects.filter(p=>!p.archived).flatMap(p=>(p.milestones||[]).map(m=>({project:p,milestone:m,balance:Math.max(0,m.amount-(m.transactions||[]).reduce((a,t)=>a+(t.type==='refund'?-Math.abs(t.amount):t.amount),0)),risk:state.health(p)!=='onTrack'}))).filter(x=>x.balance>0)}
function capacity(state){const date=state.date,loads=new Map();for(const p of state.projects.filter(p=>!p.archived&&p.secretaryStatus!=='completed'))for(const s of p.stages)if(s.status!=='done')for(const a of s.assignments||[]){const start=a.startDate||s.forecastStart,end=a.endDate||s.forecastEnd;if(start<=date&&end>=date){const v=loads.get(a.memberId)||{load:0,projects:new Set()};v.load+=Number(a.load)||0;v.projects.add(p.id);loads.set(a.memberId,v)}}return state.team.map(m=>({...m,load:loads.get(m.id)?.load||0,projects:[...(loads.get(m.id)?.projects||[])]})).sort((a,b)=>b.load-a.load)}
root.PPSecretaryCore={match,parse,route,createFields,parseDate,label,statuses,stageNames,operationalPatch,facts,signalDetails,paymentRows,capacity,clone};
if(typeof module!=='undefined')module.exports=root.PPSecretaryCore;
})(typeof window!=='undefined'?window:globalThis);
