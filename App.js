// ===== Utils =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; } };
const formatRUB = (v) => new Intl.NumberFormat('ru-RU', { style:'currency', currency:'RUB' }).format(v);
const escapeHtml = (str) => String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));

function notify(msg){
  const n = document.createElement('div');
  Object.assign(n.style,{
    position:'fixed', top:'18px', left:'50%', transform:'translateX(-50%)',
    background:'#3b82f6', color:'#fff', padding:'10px 16px', borderRadius:'8px',
    boxShadow:'0 6px 18px rgba(0,0,0,.3)', zIndex:1002, fontWeight:'600'
  });
  n.textContent = msg; document.body.appendChild(n);
  setTimeout(()=>{ n.style.opacity='0'; n.style.transition='opacity .2s'; setTimeout(()=>n.remove(),250); }, 2200);
}

// ===== State =====
const defaultMonthly = [
  {id:'food', name:'Еда', amount:0},
  {id:'transport', name:'Транспорт', amount:0},
  {id:'home', name:'Дом', amount:0},
  {id:'other', name:'Другое', amount:0}
];
let currentBalance = load('currentBalance', 0);
let editingGoalId = null;

// ===== Categories & Charts =====
const getMonthly = () => load('monthlyCategories', defaultMonthly.slice());
const setMonthly = (cats) => { save('monthlyCategories', cats); renderCharts(); };

function renderCharts(){
  const cats = getMonthly();
  const total = cats.reduce((s,c)=> s + (Number(c.amount)||0), 0) || 0;

  const chartDataEl = $('#chartData');
  const chartDataStatsEl = $('#chartDataStats');
  if(chartDataEl) chartDataEl.innerHTML = '';
  if(chartDataStatsEl) chartDataStatsEl.innerHTML = '';

  let angle = 0;
  cats.forEach((c, i)=>{
    const val = Number(c.amount)||0;
    const pct = total ? Math.round((val/total)*100) : 0;
    const display = `${pct}% ${formatRUB(val)}`;
    const row = document.createElement('div');
    row.className='chart-row';
    row.innerHTML = `<div class="category-name">${escapeHtml(c.name)}</div><div class="category-value">${escapeHtml(display)}</div>`;
    chartDataEl?.appendChild(row);
    chartDataStatsEl?.appendChild(row.cloneNode(true));

    const start = angle;
    const sliceMain = document.getElementById('slice'+(i+1));
    const sliceStats = document.getElementById('slice'+(i+1)+'_stats');
    if(sliceMain) sliceMain.style.transform = `rotate(${start}deg) scale(1)`;
    if(sliceStats) sliceStats.style.transform = `rotate(${start}deg) scale(1)`;
    angle += (pct/100)*360;
  });

  for(let i=cats.length; i<4; i++){
    const row = document.createElement('div');
    row.className='chart-row';
    row.innerHTML = `<div class="category-name">—</div><div class="category-value">—</div>`;
    chartDataEl?.appendChild(row);
    chartDataStatsEl?.appendChild(row.cloneNode(true));
  }

  const sel = $('#expenseCategory');
  if(sel){
    sel.innerHTML = '';
    cats.forEach(c=>{
      const opt = document.createElement('option'); opt.value=c.name; opt.textContent=c.name; sel.appendChild(opt);
    });
    if(!cats.find(x=>x.name==='Другое')){
      const o=document.createElement('option'); o.value='Другое'; o.textContent='Другое'; sel.appendChild(o);
    }
  }
}

function openEditMonthly(){
  const m = $('#editMonthlyModal'); if(!m) return;
  const list = $('#monthlyEditList'); list.innerHTML='';
  const cats = getMonthly();
  cats.forEach(c=>{
    const row = document.createElement('div');
    row.style.display='flex'; row.style.gap='8px'; row.style.marginBottom='8px'; row.style.alignItems='center';
    row.innerHTML = `
      <input class="form-input" style="flex:1" data-id="${escapeHtml(c.id)}" value="${escapeHtml(c.name)}" />
      <input class="form-input" style="width:120px" data-amount="${escapeHtml(c.id)}" type="number" min="0" step="0.01" value="${escapeHtml(c.amount)}" />
      <button class="small-btn btnRemoveMonthly" data-id="${escapeHtml(c.id)}">Удалить</button>
    `;
    list.appendChild(row);
  });
  const addRow = document.createElement('div');
  addRow.style.display='flex'; addRow.style.gap='8px'; addRow.style.marginTop='6px';
  addRow.innerHTML = `
    <input id="newMonthlyName" class="form-input" placeholder="Новая категория" style="flex:1"/>
    <input id="newMonthlyAmount" class="form-input" type="number" step="0.01" placeholder="Сумма" style="width:120px"/>
    <button class="small-btn" id="btnAddMonthly">Добавить</button>`;
  list.appendChild(addRow);

  m.style.display='flex';
}
function closeEditMonthly(){ const m=$('#editMonthlyModal'); if(m) m.style.display='none'; }

function saveMonthly(){
  const list = $('#monthlyEditList'); if(!list) return;
  const inputs = list.querySelectorAll('input[data-id]');
  const cats = [];
  inputs.forEach(inp=>{
    const id = inp.getAttribute('data-id');
    const name = inp.value.trim() || 'Категория';
    const amtInput = list.querySelector(`input[data-amount="${id}"]`);
    const amount = amtInput ? (parseFloat(amtInput.value)||0) : 0;
    cats.push({ id, name, amount });
  });
  setMonthly(cats);
  closeEditMonthly();
  notify('Категории сохранены');
}

function removeMonthly(id){
  let cats = getMonthly().filter(c=>c.id!==id);
  if(cats.length===0) cats = defaultMonthly.slice();
  setMonthly(cats);
  openEditMonthly();
}

function addMonthly(){
  const name = ($('#newMonthlyName')?.value||'').trim();
  const amount = parseFloat($('#newMonthlyAmount')?.value||'')||0;
  if(!name){ notify('Введите имя категории'); return; }
  const cats = getMonthly();
  const id = name.toLowerCase().replace(/\s+/g,'_')+'_'+Date.now();
  cats.push({ id, name, amount });
  setMonthly(cats);
  openEditMonthly();
}

function resetMonthly(){
  if(!confirm('Сбросить категории к значениям по умолчанию?')) return;
  setMonthly(defaultMonthly.slice());
  notify('Категории сброшены');
  closeEditMonthly();
}

// ===== Expenses =====
function expenseItem({ amount, category, comment, date }){
  const wrap = document.createElement('div');
  wrap.className='expense-item';
  const displayDate = date ? new Date(date).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU');
  const commentText = comment?.trim() ? comment : 'Без комментария';
  wrap.innerHTML = `
    <div class="expense-details">
      <div>${escapeHtml(commentText)}</div>
      <div class="expense-category">${escapeHtml(category)}</div>
      <div class="expense-date">${escapeHtml(displayDate)}</div>
    </div>
    <div class="expense-amount">-${formatRUB(amount)}</div>`;
  return wrap;
}

function loadExpenses(){
  const expenses = load('expenses', []);
  const main = $('#mainExpenseList'); const stats = $('#statsExpenseList');
  if(main) main.innerHTML=''; if(stats) stats.innerHTML='';
  expenses.forEach(exp=>{
    const item = expenseItem(exp);
    main?.appendChild(item.cloneNode(true));
    stats?.appendChild(item.cloneNode(true));
  });
}

function openAddExpense(){
  const m = $('#addExpenseModal'); if(!m) return;
  renderCharts();
  m.style.display='flex';
  const a=$('#expenseAmount'); a && setTimeout(()=>a.focus(),50);
  const d=$('#expenseDate'); if(d && !d.value) d.valueAsDate=new Date();
}
function closeAddExpense(){ const m=$('#addExpenseModal'); if(m) m.style.display='none'; }

function saveExpense(){
  const amount = parseFloat($('#expenseAmount')?.value||'');
  const category = $('#expenseCategory')?.value || 'Другое';
  const comment = $('#expenseComment')?.value || '';
  const dateValue = $('#expenseDate')?.value || new Date().toISOString().split('T')[0];
  if(!amount || amount<=0 || isNaN(amount)){ notify('Пожалуйста, введите корректную сумму'); return; }

  currentBalance = parseFloat((currentBalance - amount).toFixed(2));
  updateBalance();

  const newExp = { amount: parseFloat(amount), category, comment, date: dateValue, id: Date.now() };
  const expenses = load('expenses', []);
  expenses.unshift(newExp); save('expenses', expenses);

  const item = expenseItem(newExp);
  $('#mainExpenseList')?.prepend(item.cloneNode(true));
  $('#statsExpenseList')?.prepend(item.cloneNode(true));

  notify(`Расход на ${formatRUB(amount)} добавлен`);
  closeAddExpense();
  const d=$('#expenseDate'); if(d) d.valueAsDate=new Date();
  const a=$('#expenseAmount'); if(a) a.value='';
  const c=$('#expenseComment'); if(c) c.value='';

  renderCharts();
}

function resetExpenses(){
  if(!confirm('Удалить все сохранённые расходы?')) return;
  save('expenses', []);
  loadExpenses();
  notify('Все расходы удалены');
}

// ===== Balance =====
function updateBalance(){
  const el=$('#totalBalance'); if(el) el.textContent = formatRUB(currentBalance);
  save('currentBalance', currentBalance);
}
function openBalanceModal(){
  const m=$('#resetBalanceModal'); if(!m) return;
  m.style.display='flex';
  const a=$('#newBalanceAmount'); a && setTimeout(()=>a.focus(),50);
}
function closeBalanceModal(){ const m=$('#resetBalanceModal'); if(m) m.style.display='none'; }
function saveBalance(){
  const v = parseFloat($('#newBalanceAmount')?.value||'');
  if(isNaN(v)||v<0){ notify('Пожалуйста, введите корректную сумму'); return; }
  currentBalance = parseFloat(v);
  updateBalance();
  notify(`Баланс установлен: ${formatRUB(v)}`);
  closeBalanceModal();
}

// ===== Goals =====
function openAddGoal(){ const m=$('#addGoalModal'); if(!m) return; m.style.display='flex'; const t=$('#goalTitle'); t && setTimeout(()=>t.focus(),50); }
function closeAddGoal(){ const m=$('#addGoalModal'); if(m) m.style.display='none'; }

function addGoal(){
  const title = ($('#goalTitle')?.value||'').trim();
  const target = parseFloat($('#goalTarget')?.value||'')||0;
  const savedAmt = parseFloat($('#goalSaved')?.value||'')||0;
  const comment = $('#goalComment')?.value||'';
  if(!title){ notify('Введите название цели'); return; }
  if(target<=0){ notify('Введите корректную целевую сумму'); return; }
  const goals=load('goals',[]);
  const newGoal={id:Date.now(), title, target:parseFloat(target), saved:parseFloat(savedAmt), comment};
  goals.unshift(newGoal); save('goals',goals);
  closeAddGoal(); renderGoals(); notify('Цель добавлена');
}

function renderGoals(){
  const goals=load('goals',[]);
  const list=$('#goalsList'); const listFull=$('#goalsListFull');
  if(list) list.innerHTML=''; if(listFull) listFull.innerHTML='';
  goals.forEach(goal=>{
    const percent = goal.target ? Math.min(100, Math.round((goal.saved/goal.target)*100)) : 0;
    const el = document.createElement('div'); el.className='goal-card';
    el.innerHTML = `
      <div class="goal-header">
        <div class="goal-icon"><i class="fas fa-bullseye"></i></div>
        <div style="flex:1">
          <div class="goal-title">${escapeHtml(goal.title)}</div>
          <div class="goal-status">${formatRUB(goal.saved)} из ${formatRUB(goal.target)} — ${percent}%</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <div style="font-size:12px;color:rgba(255,255,255,.6)">${escapeHtml(goal.comment||'')}</div>
          <div style="display:flex;gap:6px;">
            <button class="small-btn btnOpenContribute" data-id="${goal.id}">Внести</button>
            <button class="small-btn btnDeleteGoal" data-id="${goal.id}" style="background:rgba(239,68,68,.06);color:#fecaca">Удалить</button>
          </div>
        </div>
      </div>
      <div class="goal-progress"><div class="progress-bar" style="width:${percent}%; background:${percent>=100? 'linear-gradient(135deg,#10b981,#34d399)' : 'linear-gradient(135deg,#f59e0b,#fbbf24)'}"></div></div>`;
    list?.appendChild(el.cloneNode(true));
    listFull?.appendChild(el.cloneNode(true));
  });
}

function openContribute(id){
  editingGoalId = Number(id);
  const m=$('#contributeModal'); if(!m) return;
  m.style.display='flex';
  const inp=$('#contributeAmount'); if(inp){ inp.value='0'; setTimeout(()=>inp.focus(),50); }
}
function closeContribute(){ const m=$('#contributeModal'); if(m) m.style.display='none'; editingGoalId=null; }

function contributeGoal(){
  const amount = parseFloat($('#contributeAmount')?.value||'')||0;
  if(!editingGoalId || amount<=0){ notify('Введите корректную сумму'); return; }
  const goals=load('goals',[]);
  const idx=goals.findIndex(g=>g.id===editingGoalId);
  if(idx===-1){ notify('Цель не найдена'); closeContribute(); return; }
  goals[idx].saved = parseFloat((goals[idx].saved + amount).toFixed(2));
  save('goals',goals);
  if(currentBalance >= amount){
    currentBalance = parseFloat((currentBalance - amount).toFixed(2));
    updateBalance();
  }
  renderGoals();
  closeContribute();
  notify(`Внесено ${formatRUB(amount)} в цель`);
}

function deleteGoal(id){
  if(!confirm('Удалить цель?')) return;
  const goals=load('goals',[]).filter(g=>g.id!==Number(id));
  save('goals',goals);
  renderGoals();
  notify('Цель удалена');
}

// ===== Reminders =====
function renderReminders(){
  const reminders = load('reminders',[]);
  const c=$('#remindersList'); if(!c) return; c.innerHTML='';
  reminders.forEach(r=>{
    const el=document.createElement('div'); el.className='reminder-item';
    const timeText = r.datetime ? new Date(r.datetime).toLocaleString('ru-RU') : (r.time||'');
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="reminder-title">${escapeHtml(r.title)}</div>
          <div class="reminder-time">${escapeHtml(timeText)} ${r.comment? '— '+escapeHtml(r.comment):''}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <button class="small-btn btnDeleteReminder" data-id="${r.id}" style="background:rgba(239,68,68,.06);color:#fecaca">Удалить</button>
        </div>
      </div>`;
    c.appendChild(el);
  });
}

function openAddReminder(){
  const m=$('#addReminderModal'); if(!m) return;
  m.style.display='flex';
  const t=$('#reminderTitleInput'); t && setTimeout(()=>t.focus(),50);
  const rd=$('#reminderDatetime');
  if(rd && !rd.value){ const now=new Date(); now.setMinutes(now.getMinutes()+60); rd.value=now.toISOString().slice(0,16); }
}
function closeAddReminder(){ const m=$('#addReminderModal'); if(m) m.style.display='none'; }

function addReminder(){
  const title = ($('#reminderTitleInput')?.value||'').trim();
  const datetime = $('#reminderDatetime')?.value || '';
  const comment = $('#reminderComment')?.value || '';
  if(!title){ notify('Введите название напоминания'); return; }
  const reminders = load('reminders',[]);
  reminders.unshift({ id:Date.now(), title, datetime, comment });
  save('reminders',reminders);
  closeAddReminder();
  renderReminders();
  notify('Напоминание добавлено');
}

function deleteReminder(id){
  if(!confirm('Удалить напоминание?')) return;
  const reminders = load('reminders',[]).filter(r=>r.id!==Number(id));
  save('reminders',reminders);
  renderReminders();
  notify('Напоминание удалено');
}

// ===== Navigation =====
function navTo(section){
  const ids = ['homeSection','statisticsSection','goalsSection','remindersSection'];
  ids.forEach(id => document.getElementById(id).classList.add('hidden'));
  if(section==='statistics') $('#statisticsSection').classList.remove('hidden');
  else if(section==='goals') $('#goalsSection').classList.remove('hidden');
  else if(section==='reminders') $('#remindersSection').classList.remove('hidden');
  else $('#homeSection').classList.remove('hidden');

  const nav = $$('.nav-item'); nav.forEach(n=>n.classList.remove('active'));
  if(section==='statistics') nav[1]?.classList.add('active');
  else if(section==='goals') nav[2]?.classList.add('active');
  else if(section==='reminders') nav[3]?.classList.add('active');
  else nav[0]?.classList.add('active');

  const sc=$('.scrollable-content'); if(sc) sc.scrollTop=0;
}

// ===== Event bindings =====
function bindEvents(){
  // Навигация
  $('#navHome')?.addEventListener('click', ()=>navTo('home'));
  $('#navStatistics')?.addEventListener('click', ()=>navTo('statistics'));
  $('#navGoals')?.addEventListener('click', ()=>navTo('goals'));
  $('#navReminders')?.addEventListener('click', ()=>navTo('reminders'));

  $('#btnNavStatistics')?.addEventListener('click', ()=>navTo('statistics'));
  $('#btnNavGoals')?.addEventListener('click', ()=>navTo('goals'));
  $('#btnNavReminders')?.addEventListener('click', ()=>navTo('reminders'));

  // Баланс
  $('#btnOpenBalanceModal')?.addEventListener('click', openBalanceModal);
  $('#btnCloseBalanceModal')?.addEventListener('click', closeBalanceModal);
  $('#btnSaveBalance')?.addEventListener('click', saveBalance);

  // Расходы
  const openAddExp = ()=>openAddExpense();
  $('#btnOpenAddExpense')?.addEventListener('click', openAddExp);
  $('#btnOpenAddExpense2')?.addEventListener('click', openAddExp);
  $('#btnCloseAddExpense')?.addEventListener('click', closeAddExpense);
  $('#btnSaveExpense')?.addEventListener('click', saveExpense);
  $('#btnResetExpenses')?.addEventListener('click', resetExpenses);

  // Категории
  $('#btnOpenEditMonthly')?.addEventListener('click', openEditMonthly);
  $('#btnCloseEditMonthly')?.addEventListener('click', closeEditMonthly);
  $('#btnSaveMonthly')?.addEventListener('click', saveMonthly);
  $('#btnResetMonthly')?.addEventListener('click', resetMonthly);
  $('#btnResetMonthly2')?.addEventListener('click', resetMonthly);
  // делегация удаления/добавления в модалке
  $('#editMonthlyModal')?.addEventListener('click', (e)=>{
    const rmBtn = e.target.closest('.btnRemoveMonthly');
    if(rmBtn) removeMonthly(rmBtn.getAttribute('data-id'));
    if(e.target.id==='btnAddMonthly') addMonthly();
  });

  // Цели
  $('#btnOpenAddGoal')?.addEventListener('click', openAddGoal);
  $('#btnCloseAddGoal')?.addEventListener('click', closeAddGoal);
  $('#btnAddGoal')?.addEventListener('click', addGoal);
  $('#btnCloseContribute')?.addEventListener('click', closeContribute);
  $('#btnContributeGoal')?.addEventListener('click', contributeGoal);
  // делегация внутри списков целей
  ['#goalsList','#goalsListFull'].forEach(sel=>{
    const root = $(sel);
    root?.addEventListener('click', (e)=>{
      const btnContrib = e.target.closest('.btnOpenContribute');
      const btnDelete = e.target.closest('.btnDeleteGoal');
      if(btnContrib) openContribute(btnContrib.getAttribute('data-id'));
      if(btnDelete) deleteGoal(btnDelete.getAttribute('data-id'));
    });
  });

  // Напоминания
  $('#btnOpenAddReminder')?.addEventListener('click', openAddReminder);
  $('#btnCloseAddReminder')?.addEventListener('click', closeAddReminder);
  $('#btnAddReminder')?.addEventListener('click', addReminder);
  $('#remindersList')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btnDeleteReminder');
    if(btn) deleteReminder(btn.getAttribute('data-id'));
  });

  // Закрытие модалок по клику на фон
  window.addEventListener('click', (e)=>{
    ['addExpenseModal','resetBalanceModal','editMonthlyModal','addGoalModal','contributeModal','addReminderModal'].forEach(id=>{
      const el = document.getElementById(id);
      if(el && e.target === el) el.style.display='none';
    });
  });

  // Закрытие модалок по ESC
  window.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){
      ['addExpenseModal','resetBalanceModal','editMonthlyModal','addGoalModal','contributeModal','addReminderModal'].forEach(id=>{
        const m=document.getElementById(id); if(m) m.style.display='none';
      });
      editingGoalId=null;
    }
  });
}

// ===== Init =====
(function init(){
  try{
    const saved = load('currentBalance', null);
    if(typeof saved === 'number') currentBalance = saved;
  }catch{}
  updateBalance();

  if(!localStorage.getItem('monthlyCategories')) save('monthlyCategories', defaultMonthly);
  renderCharts();
  setTimeout(()=>renderCharts(),50);

  loadExpenses();
  renderGoals();
  renderReminders();

  bindEvents();
})();
