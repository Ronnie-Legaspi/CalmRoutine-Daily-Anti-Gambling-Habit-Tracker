/* Calm Routine SPA - script.js
   - Hash routes: #daily, #weekly, #buffers
   - LocalStorage prefix: "routine_"
   - Auto-reset at local midnight, weekly reset on Monday 00:00
*/

const ROUTINE = [
  {
    key:'morning', emoji:'🌅', title:'Morning',
    items:[
      {id:'wake', time:'7:00 AM', title:'Wake Up', hint:'Drink water, quick stretch or push-ups.'},
      {id:'no-scroll', time:'7:10 AM', title:'No Phone Scroll', hint:'Don’t feed the temptation early.'},
      {id:'breakfast', time:'7:30 AM', title:'Breakfast + Chill', hint:'Light video / music / short podcast.'},
      {id:'prod1', time:'8:00 AM', title:'Productive Task #1', hint:'Schoolwork, coding, planning, or skill-building.'},
    ]
  },
  {
    key:'midday', emoji:'☀️', title:'Midday',
    items:[
      {id:'move', time:'10:00 AM', title:'Physical Break', hint:'Walk, exercise, clean, or shower.'},
      {id:'prod2', time:'10:30 AM', title:'Productive Task #2', hint:'Continue or switch tasks consciously.'},
      {id:'lunch', time:'12:00 PM', title:'Lunch Time', hint:'No gambling content while eating.'},
    ]
  },
  {
    key:'afternoon', emoji:'🌤', title:'Afternoon',
    items:[
      {id:'hobby', time:'1:00 PM', title:'Hobby / Skill Time',
       hint:'Pick one: coding, UI, editing, business idea, workout, guitar, drawing, writing, YouTube learning.'},
      {id:'social', time:'3:00 PM', title:'Social / Errands', hint:'Hangout, call a friend, school tasks, chores.'},
      {id:'free', time:'4:30 PM', title:'Free Time (Safe)', hint:'Gaming, music, Netflix, walk, coffee, gym.'},
    ]
  },
  {
    key:'evening', emoji:'🌙', title:'Evening',
    items:[
      {id:'dinner', time:'6:00 PM', title:'Dinner'},
      {id:'progress', time:'7:00 PM', title:'Personal Progress', hint:'Portfolio/capstone, learn a tech skill, organize finances (no gambling apps).'},
      {id:'relax', time:'9:00 PM', title:'Relax Mode', hint:'Offline games, anime, memes, chat. Avoid money-related apps/pages.'},
      {id:'wind', time:'10:30 PM', title:'Wind Down', hint:'Water, hygiene, set tomorrow’s goals.'},
      {id:'sleep', time:'11:00 PM', title:'Sleep', hint:'Protect your streak; tomorrow you’ll thank you.'},
    ]
  }
];

const WEEKLY = [
  {id:'wk-gym', label:'Gym or sport day'},
  {id:'wk-hang', label:'Hangout / bonding'},
  {id:'wk-clean', label:'Deep clean + laundry'},
  {id:'wk-hustle', label:'Side-hustle grind'},
  {id:'wk-relax', label:'Relax + gaming day'},
  {id:'wk-errands', label:'Errands / grocery'},
  {id:'wk-learn', label:'Learning day (tech or hobby)'},
];

const QUOTES = [
  "Gamble the time on yourself, not your money on chance.",
  "Small wins compound. Today’s boxes → tomorrow’s momentum.",
  "Discipline is a bridge between goals and results.",
  "If it costs your peace, it’s too expensive.",
  "Consistency beats intensity. One day at a time.",
  "Move your body, clear your mind, choose your future."
];

const GOAL_MIN = 8;
const STORE_PREFIX = 'routine_';
const TODAY_KEY = 'today';
const LAST_RESET = 'last_reset';
const STREAK_KEY = 'streak';
const WEEK_RESET = 'week_last_reset';

function todayStr(d=new Date()){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const da=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function save(key, val){ localStorage.setItem(STORE_PREFIX+key, JSON.stringify(val)); }
function load(key, fallback=null){
  const raw = localStorage.getItem(STORE_PREFIX+key);
  try{ return raw===null?fallback:JSON.parse(raw); }catch{ return fallback; }
}

/* ---------- ROUTING ---------- */
function showPage(name){
  document.querySelectorAll('.page').forEach(p=>{
    const should = p.id === `page-${name}`;
    p.setAttribute('aria-hidden', should ? 'false' : 'true');
    p.style.display = should ? 'block' : 'none';
  });
  // highlight nav link
  document.querySelectorAll('.nav-link').forEach(a=> a.classList.toggle('active', a.getAttribute('href') === `#${name}`));
}
function handleHash(){
  const hash = location.hash.replace('#','') || 'daily';
  showPage(hash);
}
window.addEventListener('hashchange', handleHash);

/* ---------- RENDER SECTIONS & WEEKLY ---------- */
function el(tag, attrs={}, children=[]){
  const x = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==='class') x.className=v;
    else if(k==='html') x.innerHTML=v;
    else x.setAttribute(k,v);
  });
  (Array.isArray(children)?children:[children]).filter(Boolean).forEach(c=> x.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return x;
}

function renderSections(){
  const sectionsEl = document.getElementById('sections');
  sectionsEl.innerHTML = '';
  ROUTINE.forEach(section=>{
    const container = el('div',{class:'card section'});
    const head = el('div',{class:'sect-head'},[
      el('div',{class:'sect-emoji'},section.emoji),
      el('div',{class:'sect-title'},section.title)
    ]);
    const tasksWrap = el('div',{class:'tasks'});
    section.items.forEach(item=>{
      const id = `${section.key}-${item.id}`;
      const task = el('div',{class:'task', id:`task-${id}`},[
        el('div',{class:'time'}, item.time),
        el('label',{class:'check', for:id},[
          el('input',{type:'checkbox', id})
        ]),
        el('div',{class:'label'},[
          el('b',{}, item.title),
          item.hint ? el('div',{class:'hint'}, item.hint) : null
        ])
      ]);
      tasksWrap.appendChild(task);
    });
    container.appendChild(head);
    container.appendChild(tasksWrap);
    sectionsEl.appendChild(container);
  });
}

function renderWeekly(){
  const box = document.getElementById('weeklyBox');
  box.innerHTML = '';
  WEEKLY.forEach(w=>{
    const id = `weekly-${w.id}`;
    const row = el('label',{class:'mini-task'},[
      el('input',{type:'checkbox', id}),
      el('span',{}, w.label)
    ]);
    box.appendChild(row);
  });
}

/* ---------- STATE HANDLING ---------- */
function allTaskInputs(){
  return Array.from(document.querySelectorAll('.tasks input[type="checkbox"]')).filter(i=> !i.id.startsWith('weekly-'));
}

function updateCounts(){
  const inputs = allTaskInputs();
  const done = inputs.filter(i=> i.checked).length;
  document.getElementById('doneCount').textContent = done;
  document.getElementById('totalCount').textContent = inputs.length;
  const pct = Math.round((done/inputs.length)*100) || 0;
  document.getElementById('progressBar').style.width = pct + '%';
}

function restoreChecks(){
  const savedDay = load(TODAY_KEY);
  const today = todayStr();
  allTaskInputs().forEach(cb=>{
    const saved = load(cb.id, false);
    cb.checked = !!saved && savedDay === today;
    cb.closest('.task').classList.toggle('done', cb.checked);
  });
  // weekly
  WEEKLY.forEach(w=>{
    const id = `weekly-${w.id}`;
    const el = document.getElementById(id);
    if(el) el.checked = !!load(id, false);
  });
  updateCounts();
}

/* ---------- EVENTS ---------- */
document.addEventListener('change', (e)=>{
  if(e.target.matches('.tasks input[type="checkbox"]')){
    const id = e.target.id;
    save(id, e.target.checked);
    if(!id.startsWith('weekly-')){
      save(TODAY_KEY, todayStr());
      e.target.closest('.task').classList.toggle('done', e.target.checked);
      updateCounts();
    }
  }
  if(e.target.matches('#weeklyBox input[type="checkbox"]')){
    save(e.target.id, e.target.checked);
  }
});

/* ---------- DAILY RESET & STREAK ---------- */
function msUntilNextMidnight(){
  const now = new Date();
  const next = new Date(now);
  next.setHours(24,0,0,0);
  return next - now;
}
function dailyResetLogic({fromTimer=false}={}){
  // compute done before clearing
  const done = allTaskInputs().filter(cb=>cb.checked).length;
  let streak = load(STREAK_KEY, 0) || 0;
  if(done >= GOAL_MIN) streak += 1; else streak = 0;
  save(STREAK_KEY, streak);
  document.getElementById('streak').textContent = streak;

  // clear tasks
  allTaskInputs().forEach(cb=>{
    cb.checked = false;
    save(cb.id, false);
    cb.closest('.task').classList.remove('done');
  });
  save(TODAY_KEY, todayStr());
  save(LAST_RESET, todayStr());
  updateCounts();

  if(fromTimer) scheduleMidnightTimer();
}
function scheduleMidnightTimer(){
  const t = msUntilNextMidnight();
  setTimeout(()=> dailyResetLogic({fromTimer:true}), t);
}

/* ---------- WEEKLY RESET (Monday 00:00) ---------- */
function msUntilNextMondayMidnight(){
  const now = new Date();
  const next = new Date(now);
  const delta = (8 - now.getDay()) % 7 || 7;
  next.setDate(now.getDate() + delta);
  next.setHours(0,0,0,0);
  return next - now;
}
function weeklyReset(){
  WEEKLY.forEach(w=>{ const id = `weekly-${w.id}`; save(id,false); const el = document.getElementById(id); if(el) el.checked = false; });
  save(WEEK_RESET, todayStr());
}
function scheduleWeeklyTimer(){
  const t = msUntilNextMondayMidnight();
  setTimeout(()=>{ weeklyReset(); scheduleWeeklyTimer(); }, t);
}

/* ---------- QUOTE, DATE, BUTTONS ---------- */
function pickQuote(){ document.getElementById('quote').textContent = QUOTES[Math.floor(Math.random()*QUOTES.length)]; }
function setTodayLabel(){ const d=new Date(); const opts={ weekday:'long', month:'long', day:'numeric' }; document.getElementById('todayLabel').textContent = d.toLocaleDateString(undefined,opts); }
document.getElementById('resetBtn').addEventListener('click', ()=> dailyResetLogic());
document.getElementById('simulateMidnight').addEventListener('click', ()=> dailyResetLogic());
document.getElementById('resetWeek').addEventListener('click', weeklyReset);
document.getElementById('exportWeek').addEventListener('click', ()=>{
  // small export of weekly as JSON
  const obj = WEEKLY.reduce((acc,w)=>{ acc[w.id] = !!load(`weekly-${w.id}`); return acc; }, {});
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'weekly-plan.json'; a.click();
  URL.revokeObjectURL(url);
});

/* ---------- INIT ---------- */
function init(){
  // render UI
  renderSections();
  renderWeekly();
  setTodayLabel();
  pickQuote();

  // restore state
  const lastReset = load(LAST_RESET, null);
  const today = todayStr();
  if(lastReset !== today){
    // Clear daily saved checks to avoid cross-day carryover when app was closed.
    ROUTINE.forEach(sec=> sec.items.forEach(it=>{
      const key = `${sec.key}-${it.id}`;
      save(key, false);
    }));
  }
  document.getElementById('streak').textContent = load(STREAK_KEY, 0) || 0;

  restoreChecks();

  scheduleMidnightTimer();
  scheduleWeeklyTimer();

  // routing
  handleHash();
  if(!location.hash) location.hash = '#daily';
}

/* run */
document.addEventListener('DOMContentLoaded', init);
