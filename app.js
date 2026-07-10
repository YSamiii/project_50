const KEY='project-challenge-v2';
const OLD_KEY='project-challenge-v1';
function uid(){return crypto?.randomUUID?.()||('r'+Date.now()+Math.random().toString(16).slice(2))}
function createDefaultRules(){return [
  {id:uid(),icon:'⏰',text:'8点前起床',category:'晨间',type:'required',score:15},
  {id:uid(),icon:'☀️',text:'完成不被打扰的晨间仪式',category:'晨间',type:'required',score:15},
  {id:uid(),icon:'🏃',text:'运动 1 小时',category:'健康',type:'required',score:20},
  {id:uid(),icon:'📖',text:'阅读 10 页',category:'成长',type:'required',score:15},
  {id:uid(),icon:'🎯',text:'专注技能或项目 1 小时',category:'成长',type:'required',score:20},
  {id:uid(),icon:'🥗',text:'健康饮食',category:'健康',type:'required',score:15},
  {id:uid(),icon:'✍️',text:'记录过程与进步',category:'记录',type:'bonus',score:0}
]}
function makeDefaultState(){return {name:'Project 50',days:50,start:localDate(),ruleMode:'checkin',completionMode:'all',completionPercent:80,manifesto:'我将在接下来的挑战中，坚持完成自己的计划。',rules:createDefaultRules(),rewards:[{day:10,text:'一对耳钉'},{day:30,text:'SPA'},{day:50,text:'周末旅行'}],entries:{}}}
let defaultState=makeDefaultState();
let state=load();
let selectedDate=localDate();
function localDate(d=new Date()){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}
function migrate(raw){
  const s={...makeDefaultState(),...raw};
  s.ruleMode=s.ruleMode||'checkin';
  s.rules=(s.rules||[]).map((r,i)=>({...r,type:r.type||'required',score:Number.isFinite(+r.score)?+r.score:Math.round(100/Math.max(1,s.rules.length))}));
  return s;
}
function load(){try{const raw=localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY);return raw?migrate(JSON.parse(raw)):makeDefaultState()}catch{return makeDefaultState()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
function saveQuiet(){localStorage.setItem(KEY,JSON.stringify(state));renderHeader()}
function entry(date){if(!state.entries[date])state.entries[date]={checks:{},wakeTime:'',sleepHours:'',mood:'',gratitude:'',reflection:'',progressNote:''};return state.entries[date]}
function dayIndex(date){const a=new Date(state.start+'T00:00:00'),b=new Date(date+'T00:00:00');return Math.floor((b-a)/86400000)+1}
function dateForDay(n){const d=new Date(state.start+'T00:00:00');d.setDate(d.getDate()+n-1);return localDate(d)}
function requiredRules(){return state.rules.filter(r=>r.type!=='bonus')}
function bonusRules(){return state.rules.filter(r=>r.type==='bonus')}
function maxPossibleScore(){return requiredRules().reduce((a,r)=>a+(+r.score||0),0)+Math.max(0,...bonusRules().map(r=>+r.score||0))}
function scoreFor(date){const e=state.entries[date];if(!e)return 0;let score=requiredRules().reduce((a,r)=>a+(e.checks?.[r.id]?(+r.score||0):0),0);const bonus=Math.max(0,...bonusRules().filter(r=>e.checks?.[r.id]).map(r=>+r.score||0));return Math.min(100,score+bonus)}
function completionFor(date){
  if(state.ruleMode==='score')return scoreFor(date)/100;
  const req=requiredRules(),e=state.entries[date];if(!e||!req.length)return 0;
  return req.filter(r=>e.checks?.[r.id]).length/req.length;
}
function isComplete(date){if(state.ruleMode==='score')return scoreFor(date)>=100;const p=completionFor(date);return state.completionMode==='all'?p===1:p*100>=state.completionPercent}
function challengeAverage(includeFuture=false){let total=0,count=0;const today=localDate();for(let i=1;i<=state.days;i++){const d=dateForDay(i);if(!includeFuture&&d>today)continue;total+=scoreFor(d);count++}return count?total/count:0}
function nav(view){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${view}`));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const map={today:'今日打卡',calendar:'挑战日历',rules:'挑战规则',rewards:'阶段奖励',settings:'挑战设置'};pageTitle.textContent=map[view]}
function renderHeader(){challengeLabel.textContent=state.name.toUpperCase();const todayDay=Math.min(Math.max(dayIndex(localDate()),1),state.days);const completed=Array.from({length:state.days},(_,i)=>isComplete(dateForDay(i+1))).filter(Boolean).length;const pct=Math.round(completed/state.days*100);sideProgress.textContent=`Day ${todayDay} / ${state.days}`;progressPercent.textContent=`${pct}%`;progressRing.style.setProperty('--p',`${pct*3.6}deg`)}
function ruleRow(r,e){const row=document.createElement('label');row.className='check-item'+(e.checks[r.id]?' done':'');const scoreTag=state.ruleMode==='score'?`<small class="score-tag">${r.type==='bonus'?'最高 ':''}${+r.score||0} 分</small>`:`<small class="muted">${escapeHtml(r.category||'')}</small>`;row.innerHTML=`<input type="checkbox" ${e.checks[r.id]?'checked':''}><span><span class="rule-icon">${r.icon||'✓'}</span> <span class="rule-text">${escapeHtml(r.text)}</span></span>${scoreTag}`;row.querySelector('input').onchange=x=>{entry(selectedDate).checks[r.id]=x.target.checked;save()};return row}
function renderToday(){
  entryDate.value=selectedDate;const e=entry(selectedDate);dayNumber.textContent=Math.max(1,dayIndex(selectedDate));dayTotal.textContent=`/${state.days}`;wakeTime.value=e.wakeTime||'';sleepHours.value=e.sleepHours||'';mood.value=e.mood||'';gratitude.value=e.gratitude||'';reflection.value=e.reflection||'';progressNote.value=e.progressNote||'';todayRules.innerHTML='';
  const req=requiredRules(),bonus=bonusRules();
  if(req.length){const h=document.createElement('div');h.className='rule-group-title';h.innerHTML='<h3>必须完成项</h3>';todayRules.appendChild(h);req.forEach(r=>todayRules.appendChild(ruleRow(r,e)))}
  if(bonus.length){const h=document.createElement('div');h.className='rule-group-title';h.innerHTML='<h3>加分项</h3>';todayRules.appendChild(h);if(state.ruleMode==='score'){const n=document.createElement('div');n.className='bonus-note';n.textContent='完成多个加分项时，只计其中分数最高的一项。';todayRules.appendChild(n)}bonus.forEach(r=>todayRules.appendChild(ruleRow(r,e)))}
  if(state.ruleMode==='score'){
    const score=scoreFor(selectedDate);summaryTitle.textContent='今日得分';doneCount.textContent=score;ruleCount.textContent='/ 100 分';todayBar.style.width=Math.min(100,score)+'%';completionHint.textContent=score>=100?'今天已满分完成':'继续完成规则以提高得分';scoreStats.style.display='flex';currentAverage.textContent=challengeAverage(false).toFixed(1)+' 分';projectedAverage.textContent=challengeAverage(true).toFixed(1)+' 分';
  }else{
    const done=req.filter(r=>e.checks[r.id]).length;summaryTitle.textContent='今日完成情况';doneCount.textContent=done;ruleCount.textContent=`/ ${req.length} 项`;const pct=req.length?done/req.length*100:0;todayBar.style.width=pct+'%';completionHint.textContent=isComplete(selectedDate)?'今天已达到完成标准':'继续完成今天的必须项';scoreStats.style.display='none';
  }
}
function renderCalendar(){calendarTitle.textContent=`${state.name} 打卡记录`;dayGrid.innerHTML='';for(let i=1;i<=state.days;i++){const date=dateForDay(i),p=completionFor(date);const b=document.createElement('button');b.className='day-tile '+(isComplete(date)?'done':p>0?'partial':'')+(date===selectedDate?' current':'');const metric=state.ruleMode==='score'?`${scoreFor(date)} 分`:`${Math.round(p*100)}% 完成`;b.innerHTML=`<strong>Day ${i}</strong><span>${date}</span><span>${metric}</span>`;b.onclick=()=>{selectedDate=date;nav('today');renderToday()};dayGrid.appendChild(b)}}
function editorRow(r,i){const row=document.createElement('div');row.className='edit-row rule-score-row';row.innerHTML=`<input class="emoji-input" value="${escapeAttr(r.icon||'')}" maxlength="3"><input value="${escapeAttr(r.text)}"><select><option>晨间</option><option>健康</option><option>成长</option><option>记录</option><option>其他</option></select><div class="score-input-wrap"><input class="score-input" type="number" min="0" max="100" step="1" value="${+r.score||0}" title="分数"><span>分</span></div><button class="delete-btn">×</button>`;const [icon,text,cat,scoreWrap,del]=row.children;const score=scoreWrap.querySelector('input');cat.value=r.category||'其他';icon.oninput=()=>{r.icon=icon.value;saveQuiet()};text.oninput=()=>{r.text=text.value;saveQuiet()};cat.onchange=()=>{r.category=cat.value;save()};score.onchange=()=>{r.score=Math.max(0,Math.min(100,+score.value||0));save()};del.onclick=()=>{state.rules.splice(state.rules.indexOf(r),1);save()};if(state.ruleMode!=='score')scoreWrap.style.display='none';return row}
function renderRules(){ruleMode.value=state.ruleMode;requiredRuleEditor.innerHTML='';bonusRuleEditor.innerHTML='';requiredRules().forEach((r,i)=>requiredRuleEditor.appendChild(editorRow(r,i)));bonusRules().forEach((r,i)=>bonusRuleEditor.appendChild(editorRow(r,i)));const total=maxPossibleScore();scoreValidation.className='score-validation '+(total===100?'ok':'warn');scoreValidation.textContent=state.ruleMode==='score'?(total===100?'满分结构正确：100 分':`当前最高总分为 ${total} 分，请调整为 100 分`):'打卡制不计算分数';document.querySelectorAll('.score-input-wrap').forEach(x=>x.style.display=state.ruleMode==='score'?'flex':'none')}
function renderRewards(){rewardEditor.innerHTML='';state.rewards.forEach((r,i)=>{const row=document.createElement('div');row.className='edit-row reward-row';row.innerHTML=`<input type="number" min="1" max="${state.days}" value="${r.day}"><input value="${escapeAttr(r.text)}"><button class="delete-btn">×</button>`;const [day,text,del]=row.children;day.onchange=()=>{r.day=Math.min(state.days,Math.max(1,+day.value));save()};text.oninput=()=>{r.text=text.value;saveQuiet()};del.onclick=()=>{state.rewards.splice(i,1);save()};rewardEditor.appendChild(row)})}
function renderSettings(){challengeName.value=state.name;challengeDays.value=state.days;startDate.value=state.start;completionMode.value=state.completionMode;completionPercent.value=state.completionPercent;manifesto.value=state.manifesto||'';percentField.classList.toggle('hidden',state.completionMode!=='percent')}
function renderAll(){renderHeader();renderToday();renderCalendar();renderRules();renderRewards();renderSettings()}
function bindField(id,key){document.getElementById(id).addEventListener('input',e=>{entry(selectedDate)[key]=e.target.value;saveQuiet()})}
function escapeHtml(s=''){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}function escapeAttr(s=''){return escapeHtml(String(s))}
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>nav(b.dataset.view));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>nav(b.dataset.jump));
entryDate.onchange=e=>{selectedDate=e.target.value;renderToday();renderCalendar()};bindField('wakeTime','wakeTime');bindField('sleepHours','sleepHours');bindField('mood','mood');bindField('gratitude','gratitude');bindField('reflection','reflection');bindField('progressNote','progressNote');
ruleMode.onchange=()=>{state.ruleMode=ruleMode.value;save()};
addRequiredRuleBtn.onclick=()=>{state.rules.push({id:uid(),icon:'✅',text:'新必须项',category:'其他',type:'required',score:10});save()};
addBonusRuleBtn.onclick=()=>{state.rules.push({id:uid(),icon:'⭐',text:'新加分项',category:'其他',type:'bonus',score:10});save()};
restoreDefaultRulesBtn.onclick=()=>{if(confirm('确定恢复默认挑战规则吗？现有自定义规则及各日期的规则勾选记录将被替换；日记、睡眠和其他记录会保留。')){state.rules=createDefaultRules();Object.values(state.entries).forEach(e=>e.checks={});save()}};
addRewardBtn.onclick=()=>{state.rewards.push({day:Math.min(state.days,10),text:'新奖励'});save()};completionMode.onchange=()=>percentField.classList.toggle('hidden',completionMode.value!=='percent');
saveSettingsBtn.onclick=()=>{state.name=challengeName.value.trim()||`Project ${challengeDays.value}`;state.days=Math.max(1,Math.min(365,+challengeDays.value||50));state.start=startDate.value;state.completionMode=completionMode.value;state.completionPercent=Math.max(1,Math.min(100,+completionPercent.value||80));state.manifesto=manifesto.value;state.rewards.forEach(r=>r.day=Math.min(r.day,state.days));save()};
resetBtn.onclick=()=>{if(confirm('确定清空当前挑战的全部设置和打卡记录吗？')){state=makeDefaultState();selectedDate=localDate();save()}};
newChallengeBtn.onclick=()=>{newStart.value=localDate();challengeDialog.showModal()};createChallengeBtn.onclick=e=>{e.preventDefault();const days=Math.max(1,Math.min(365,+newDays.value||30));state={...makeDefaultState(),name:newName.value.trim()||`Project ${days}`,days,start:newStart.value,rewards:[{day:Math.min(10,days),text:'阶段奖励'},{day:days,text:'完成奖励'}],entries:{}};selectedDate=state.start;save();challengeDialog.close()};
exportBtn.onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${state.name.replace(/\s+/g,'-')}-data.json`;a.click();URL.revokeObjectURL(a.href)};
renderAll();
