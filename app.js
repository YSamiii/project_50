const KEY='project-xx-mobile-v4-mode';
const LEGACY_KEYS=['project-xx-scoring-mobile-v3','project-xx-scoring-mobile-v2','project50-scoring-mobile-v1','project-challenge-scoring-mobile-v1'];
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function uid(){return crypto?.randomUUID?.()||'r'+Date.now()+Math.random().toString(16).slice(2)}
function localDate(d=new Date()){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function normalizeDays(v){return Math.max(1,Math.min(3650,Math.round(+v||50)))}
function defaults(){return {days:50,start:localDate(),manifesto:'坚持完成自己的计划。',mode:'scoring',sortMode:'custom',rules:{required:[
{id:uid(),icon:'⏰',text:'按计划起床',score:15},{id:uid(),icon:'☀️',text:'完成晨间仪式',score:15},{id:uid(),icon:'🏃',text:'运动或康复训练',score:20},{id:uid(),icon:'📖',text:'阅读',score:15},{id:uid(),icon:'🎯',text:'完成核心任务',score:20}
],bonus:[{id:uid(),icon:'✍️',text:'写日记',score:15},{id:uid(),icon:'🧘',text:'冥想',score:10},{id:uid(),icon:'🧹',text:'整理空间',score:10}]},entries:{}}}
function load(){
  try{
    let raw=localStorage.getItem(KEY);
    if(!raw){for(const k of LEGACY_KEYS){raw=localStorage.getItem(k);if(raw)break}}
    const x=JSON.parse(raw||'null');
    if(!x)return defaults();
    const d=defaults();
    return {...d,...x,days:normalizeDays(x.days),mode:x.mode==='checkin'?'checkin':'scoring',sortMode:x.sortMode==='score'?'score':'custom',rules:x.rules||d.rules,entries:x.entries||{}};
  }catch{return defaults()}
}
let state=load(),selectedDate=localDate(),view='today';
function isScoring(){return state.mode==='scoring'}
function projectName(){return `Project ${state.days}`}
function save(render=true){localStorage.setItem(KEY,JSON.stringify(state));if(render)renderAll()}
function entry(date=selectedDate){if(!state.entries[date])state.entries[date]={checks:{},sleep:'',mood:'',note:''};return state.entries[date]}
function addDays(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return localDate(d)}
function dayIndex(date){return Math.floor((new Date(date+'T12:00:00')-new Date(state.start+'T12:00:00'))/86400000)+1}
function dateForDay(n){return addDays(state.start,n-1)}
function orderedRules(kind){const arr=[...state.rules[kind]];return state.sortMode==='score'&&isScoring()?arr.sort((a,b)=>(+b.score||0)-(+a.score||0)):arr}
function allRules(){return [...state.rules.required,...state.rules.bonus]}
function maxScore(){const req=state.rules.required.reduce((a,r)=>a+(+r.score||0),0);const bonus=Math.max(0,...state.rules.bonus.map(r=>+r.score||0));return req+bonus}
function scoreFor(date){const e=state.entries[date];if(!e)return 0;let s=state.rules.required.reduce((a,r)=>a+(e.checks?.[r.id]?(+r.score||0):0),0);const b=Math.max(0,...state.rules.bonus.filter(r=>e.checks?.[r.id]).map(r=>+r.score||0));return Math.min(100,s+b)}
function checkStats(date){const e=state.entries[date];const rules=allRules(),total=rules.length,done=e?rules.filter(r=>e.checks?.[r.id]).length:0;return {done,total,pct:total?done/total*100:0}}
function averages(){let sum=0,countRecorded=0,total=0;for(let i=1;i<=state.days;i++){const d=dateForDay(i);const metric=isScoring()?scoreFor(d):checkStats(d).pct;total+=metric;if(state.entries[d]){sum+=metric;countRecorded++}}return {recorded:countRecorded?sum/countRecorded:0,plan:total/state.days}}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1600)}
function updateBrand(){
  const name=projectName();
  document.title=`${name} ${isScoring()?'打分':'打卡'}挑战`;
  $('#projectEyebrow').textContent=name.toUpperCase();
  $('#settingsTitle').textContent=`${name} 设置`;
  $('#calendarTitle').textContent=`${state.days} 天打卡记录`;
  $('#recordedAverageLabel').textContent=isScoring()?'已记录天平均分':'已记录天平均完成率';
  $('#planAverageLabel').textContent=isScoring()?`${state.days} 天计划平均分`:`${state.days} 天计划完成率`;
}
function setView(v){view=v;$$('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+v));$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$('#pageTitle').textContent={today:'今日打卡',calendar:'挑战日历',rules:isScoring()?'规则与分数':'打卡规则',settings:'设置'}[v];if(v==='calendar')renderCalendar();if(v==='rules')renderRules();if(v==='settings')renderSettings()}
function checklist(rules,kind){rules=orderedRules(kind);const e=entry();return rules.map(r=>{const done=!!e.checks[r.id];const sub=isScoring()?(kind==='required'?'必须完成项':'加分项'):(kind==='required'?'核心打卡项':'可选打卡项');return `<label class="check-item ${done?'done':''}" data-kind="${kind}" data-id="${r.id}"><input type="checkbox" ${done?'checked':''}><span class="box">${done?'✓':''}</span><span><div class="rule-name">${esc(r.icon)} ${esc(r.text)}</div><div class="rule-sub">${sub}</div></span>${isScoring()?`<span class="score-tag">${+r.score||0} 分</span>`:''}</label>`}).join('')||'<div class="muted">尚未设置规则</div>'}
function renderToday(){
  const e=entry(),avg=averages(),idx=dayIndex(selectedDate),metric=isScoring()?scoreFor(selectedDate):checkStats(selectedDate).pct,cs=checkStats(selectedDate);
  $('#entryDate').value=selectedDate;$('#dayBadge').textContent=idx>=1&&idx<=state.days?`Day ${idx} / ${state.days}`:'计划外日期';
  $('#todayMetricLabel').textContent=isScoring()?'当日总分':'当日完成率';
  $('#todayScore').textContent=isScoring()?Math.round(metric):Math.round(metric);
  $('#todayMetricSuffix').textContent=isScoring()?'/ 100':'%';
  $('#ringScore').textContent=isScoring()?Math.round(metric):`${Math.round(metric)}%`;
  $('#scoreRing').style.setProperty('--pct',Math.min(100,metric)+'%');
  $('#recordedAverage').textContent=avg.recorded.toFixed(1)+(isScoring()?'':'%');
  $('#planAverage').textContent=avg.plan.toFixed(1)+(isScoring()?'':'%');
  $('#requiredChecklist').innerHTML=checklist(state.rules.required,'required');$('#bonusChecklist').innerHTML=checklist(state.rules.bonus,'bonus');
  $('#bonusTodayTitle').textContent=isScoring()?'加分项':'可选完成项';
  $('#bonusTodayHint').textContent=isScoring()?'完成多个时，只计分数最高的一项':'只记录是否完成，多个项目可同时勾选。';
  $('#requiredCount').textContent=`${state.rules.required.filter(r=>e.checks[r.id]).length}/${state.rules.required.length}`;$('#bonusCount').textContent=`${state.rules.bonus.filter(r=>e.checks[r.id]).length}/${state.rules.bonus.length}`;
  $('#sleep').value=e.sleep||'';$('#mood').value=e.mood||'';$('#note').value=e.note||'';
  $$('.check-item').forEach(row=>row.onchange=ev=>{e.checks[row.dataset.id]=ev.target.checked;save()})
}
function renderCalendar(){const html=[];for(let i=1;i<=state.days;i++){const d=dateForDay(i),has=!!state.entries[d];let value,complete;if(isScoring()){value=`${scoreFor(d)} 分`;complete=scoreFor(d)>=100}else{const c=checkStats(d);value=`${c.done}/${c.total} · ${Math.round(c.pct)}%`;complete=c.total>0&&c.done===c.total}html.push(`<button class="day-tile ${complete?'done':has?'partial':''} ${d===selectedDate?'current':''}" data-date="${d}"><strong>Day ${i}</strong><span>${d}</span><span>${value}</span></button>`)}$('#calendarGrid').innerHTML=html.join('');$$('.day-tile').forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;setView('today');renderToday()})}
function editorCard(r,kind,index,total){const manual=state.sortMode==='custom';return `<div class="editor-card ${isScoring()?'':'checkin-editor'}" data-kind="${kind}" data-id="${r.id}"><div class="editor-field icon"><label>图标</label><input class="edit-icon" value="${esc(r.icon)}" maxlength="4"></div><div class="editor-field"><label>规则名称</label><input class="edit-text" value="${esc(r.text)}"></div>${isScoring()?`<div class="editor-field score-field"><label>分数</label><input class="edit-score" type="number" min="0" max="100" step="1" inputmode="numeric" value="${+r.score||0}"></div>`:''}<div class="order-actions"><button class="secondary move-up" ${!manual||index===0?'disabled':''}>↑ 上移</button><button class="secondary move-down" ${!manual||index===total-1?'disabled':''}>↓ 下移</button></div><button class="danger remove">删除此规则</button></div>`}
function refreshScoreCheck(){const box=$('#scoreCheck');if(!isScoring()){box.hidden=true;return}box.hidden=false;const t=maxScore();box.className='score-check card '+(t===100?'ok':'warn');box.textContent=t===100?'最高总分正确：100 分':`当前最高总分为 ${t} 分。必须项总和 + 最高加分项应为 100 分。`}
function renderRules(){
  $('#challengeMode').value=state.mode;$('#sortMode').value=state.sortMode;
  $('#sortMode').querySelector('option[value="score"]').disabled=!isScoring();
  if(!isScoring()&&state.sortMode==='score')state.sortMode='custom';
  $('#sortHint').textContent=isScoring()?'自定义排序可使用上移、下移按钮；分数排序会自动按高到低显示。':'打卡制不使用分数排序，可通过上移、下移自定义顺序。';
  $('#requiredRuleHint').textContent=isScoring()?'所有必须项分数相加。':'每日仅勾选是否完成，不计算分数。';
  $('#bonusRuleTitle').textContent=isScoring()?'加分项':'可选完成项';
  $('#bonusRuleHint').textContent=isScoring()?'可设置多个，但每天只取已完成项中的最高分。':'可设置多个，完成的项目均可单独勾选。';
  const req=orderedRules('required'),bonus=orderedRules('bonus');$('#requiredEditor').innerHTML=req.map((r,i)=>editorCard(r,'required',i,req.length)).join('');$('#bonusEditor').innerHTML=bonus.map((r,i)=>editorCard(r,'bonus',i,bonus.length)).join('');refreshScoreCheck();
  $$('.editor-card').forEach(card=>{const arr=state.rules[card.dataset.kind],r=arr.find(x=>x.id===card.dataset.id);card.querySelector('.edit-icon').oninput=e=>{r.icon=e.target.value;save(false)};card.querySelector('.edit-text').oninput=e=>{r.text=e.target.value;save(false)};const score=card.querySelector('.edit-score');if(score){score.oninput=e=>{r.score=Math.max(0,Math.min(100,+e.target.value||0));save(false);refreshScoreCheck()};score.onchange=()=>{if(state.sortMode==='score')renderRules()}}card.querySelector('.move-up').onclick=()=>moveRule(card.dataset.kind,r.id,-1);card.querySelector('.move-down').onclick=()=>moveRule(card.dataset.kind,r.id,1);card.querySelector('.remove').onclick=()=>{arr.splice(arr.indexOf(r),1);Object.values(state.entries).forEach(e=>delete e.checks[r.id]);save()}})
}
function moveRule(kind,id,delta){if(state.sortMode!=='custom')return;const arr=state.rules[kind],i=arr.findIndex(r=>r.id===id),j=i+delta;if(i<0||j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];save()}
function renderSettings(){$('#challengeDays').value=state.days;$('#startDate').value=state.start;$('#manifesto').value=state.manifesto||''}
function renderAll(){updateBrand();renderToday();renderCalendar();renderRules();renderSettings()}
$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#entryDate').onchange=e=>{selectedDate=e.target.value;renderToday();renderCalendar()};$('#prevDay').onclick=()=>{selectedDate=addDays(selectedDate,-1);renderToday()};$('#nextDay').onclick=()=>{selectedDate=addDays(selectedDate,1);renderToday()};
['sleep','mood','note'].forEach(id=>$('#'+id).oninput=e=>{entry()[id]=e.target.value;save(false)});
$('#challengeMode').onchange=e=>{state.mode=e.target.value==='checkin'?'checkin':'scoring';if(!isScoring()&&state.sortMode==='score')state.sortMode='custom';save();toast(isScoring()?'已切换为打分制':'已切换为打卡制')};
$('#sortMode').onchange=e=>{state.sortMode=e.target.value==='score'&&isScoring()?'score':'custom';save();toast(state.sortMode==='score'?'已按分数由高到低排序':'已切换为自定义排序')};
$('#addRequired').onclick=()=>{state.rules.required.push({id:uid(),icon:'✅',text:'新必须项',score:10});save()};$('#addBonus').onclick=()=>{state.rules.bonus.push({id:uid(),icon:'⭐',text:isScoring()?'新加分项':'新可选项',score:10});save()};
$('#restoreDefaults').onclick=()=>{if(confirm('确定恢复默认规则吗？现有规则和规则勾选记录将被替换，日记记录会保留。')){const d=defaults();state.rules=d.rules;Object.values(state.entries).forEach(e=>e.checks={});save()}};
$('#saveSettings').onclick=()=>{state.days=normalizeDays($('#challengeDays').value);state.start=$('#startDate').value||localDate();state.manifesto=$('#manifesto').value;save();toast(`已更新为 ${projectName()}`)};
$('#exportData').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`project-${state.days}-${state.mode}-data.json`;a.click();URL.revokeObjectURL(a.href)};
$('#importData').onclick=()=>$('#importFile').click();$('#importFile').onchange=async e=>{try{const x=JSON.parse(await e.target.files[0].text());const d=defaults();state={...d,...x,days:normalizeDays(x.days),mode:x.mode==='checkin'?'checkin':'scoring',sortMode:x.sortMode==='score'?'score':'custom',rules:x.rules||d.rules,entries:x.entries||{}};if(state.mode==='checkin'&&state.sortMode==='score')state.sortMode='custom';save();toast('数据已导入')}catch{alert('JSON 文件格式错误')}};
$('#clearData').onclick=()=>{if(confirm(`确定清空 ${projectName()} 的全部规则、设置和记录吗？`)){state=defaults();selectedDate=localDate();save()}};
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
renderAll();setView('today');
