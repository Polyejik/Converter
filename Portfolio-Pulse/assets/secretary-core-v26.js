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
function facts(text,en=false){const t=clean(text),pick=(r,e)=>en?e:r;const rows=[],tasks=[];let conditional=/если|if\b|возмож|may\b/.test(t);
 if(/задерж|delay/.test(t)&&/данн|data/.test(t)){rows.push({type:'fact',text:pick('Передача данных задержана'+(/недел|week/.test(t)?' примерно на неделю.':'.'),'Input data is delayed'+(/недел|week/.test(t)?' by about one week.':'.'))});tasks.push(pick('Уточнить у клиента дату передачи данных.','Confirm the data delivery date with the client.'))}
 if(conditional&&/геолог|geolog/.test(t))rows.push({type:'risk',text:pick('Геология: риск переноса, если данные не поступят в оговорённый срок. Срок пока не изменён.','Geology may move if data does not arrive in time. No date has changed.')});
 if(/инженер|engineer/.test(t)&&/больше|дополн|добав|нужн|more|extra|need/.test(t)){let count=t.match(/(\d+)\s*(?:дополнительн\w*\s*)?(?:инженер|engineer)/);rows.push({type:'decision',text:pick(`Ресурсы: ${count?count[1]+' дополнительных инженера':'нужны дополнительные инженеры'} для сохранения срока.`,`Resources: ${count?count[1]+' additional engineers':'additional engineers needed'} to protect the deadline.`)});tasks.push(pick('Руководителю дивизиона: проверить доступную загрузку и согласовать состав команды.','Division manager: check capacity and approve the team.'))}
 if(/объем|scope/.test(t)&&/увелич|дополн|больше|more|increase|extra/.test(t)){rows.push({type:'commercial',text:pick('Расширение объёма: требуется коммерческое решение; бюджет не изменён.','Scope increase: commercial decision required; budget unchanged.')});tasks.push(pick('Оценить дополнительные трудозатраты и согласовать change order.','Estimate additional effort and approve a change order.'))}
 const percent=t.match(/(\d{1,3})\s*(?:%|процент|percent)/);if(percent)rows.push({type:+percent[1]<=100?'fact':'question',text:pick(`Заявленная готовность: ${percent[1]}%. ${+percent[1]>100?'Уточните значение от 0 до 100.':'Этап необходимо указать явно.'}`,`Reported progress: ${percent[1]}%. ${+percent[1]>100?'Please specify 0–100.':'Identify the stage explicitly.'}`)});
 if(/отправ|sent/.test(t))rows.push({type:'fact',text:pick('Результат направлен клиенту.','Deliverable sent to the client.')});
 if(!rows.length)rows.push({type:'note',text:pick('Сохраню сообщение в истории проекта без изменения сроков и финансов.','Save this message to the project record; dates and finances stay unchanged.')});return {rows,tasks};
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
 if(!p)return {...result,question:pick(m.reason==='multiple'?'Упомянуто несколько проектов. Выберите один для этого действия.':'Какой проект? Укажите код PP-… или выберите его ниже.',m.reason==='multiple'?'Several projects match. Select one for this action.':'Which project? Specify PP-… or select it below.'),candidates:m.candidates};
 result.projectId=p.id;result.project=p;result.expected=JSON.stringify(p);
 if(p.archived&&kind!=='restore'&&kind!=='open')return {...result,question:pick('Проект в архиве. Сначала восстановите его.','Project is archived. Restore it first.')};
 if(['archive','restore','open','emailDraft'].includes(kind))return result;
 if(kind==='status'){let status=statusOf(text);return {...result,status,question:status?'':pick('Какой статус: в работе, ждём клиента, приостановлен или завершён?','Which status: in progress, waiting on client, on hold, or completed?')}}
 return {...result,...facts(text,en)};
}
function paymentRows(state){return state.projects.filter(p=>!p.archived).flatMap(p=>(p.milestones||[]).map(m=>({project:p,milestone:m,balance:Math.max(0,m.amount-(m.transactions||[]).reduce((a,t)=>a+(t.type==='refund'?-Math.abs(t.amount):t.amount),0)),risk:state.health(p)!=='onTrack'}))).filter(x=>x.balance>0)}
function capacity(state){const date=state.date,loads=new Map();for(const p of state.projects.filter(p=>!p.archived&&p.secretaryStatus!=='completed'))for(const s of p.stages)if(s.status!=='done')for(const a of s.assignments||[]){const start=a.startDate||s.forecastStart,end=a.endDate||s.forecastEnd;if(start<=date&&end>=date){const v=loads.get(a.memberId)||{load:0,projects:new Set()};v.load+=Number(a.load)||0;v.projects.add(p.id);loads.set(a.memberId,v)}}return state.team.map(m=>({...m,load:loads.get(m.id)?.load||0,projects:[...(loads.get(m.id)?.projects||[])]})).sort((a,b)=>b.load-a.load)}
root.PPSecretaryCore={match,parse,route,createFields,parseDate,label,statuses,stageNames,operationalPatch,facts,paymentRows,capacity,clone};
if(typeof module!=='undefined')module.exports=root.PPSecretaryCore;
})(typeof window!=='undefined'?window:globalThis);
