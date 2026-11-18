// 진선미 · 투두 & 습관 — Crafted By. Hannah T
import { MASCOTS } from './mascots.js';

/* ---------- 기본 상수 ---------- */
const CATS = {
  jin:  { ko: '진', han: '眞', sub: '배움 · 일 · 성장',   tint: '#DCEBF2', strong: '#3E7FA3', ink: '#245E80', bar: '#7FB7D6', light: '#A9D3EA' },
  seon: { ko: '선', han: '善', sub: '관계 · 마음 · 나눔', tint: '#E3EED9', strong: '#5E8C3F', ink: '#3F6B26', bar: '#9CC77A', light: '#C3E0A6' },
  mi:   { ko: '미', han: '美', sub: '건강 · 몸 · 자기관리', tint: '#FFE1DA', strong: '#D9645A', ink: '#A63F37', bar: '#F08C80', light: '#F7B8AE' },
};
const CAT_KEYS = ['jin', 'seon', 'mi'];
const LIB = { '대화법': ['#FCE3D3', '#9C4A2A'], '연애': ['#FFE9DA', '#8F3F0A'], '재테크': ['#FFF4CC', '#7A5600'] };
const MOODS = ['최고', '좋음', '보통', '지침'];
const WK = ['일', '월', '화', '수', '목', '금', '토'];
const PTS = { full: 30, streak7: 100, miss3: -50, recover: 25 };
const REST_PER_MONTH = 2;
const KEY = 'jinseonmi.v1';

/* ---------- 날짜 ---------- */
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const md = (s) => { const d = parse(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const longDate = (s) => { const d = parse(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WK[d.getDay()]}요일`; };
const mascotIndex = (offset = 0) => {
  const d = new Date(Date.now() - 7 * 3600 * 1000); // 오전 7시에 바뀜
  return (Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) + offset) % 10;
};
const mascotFor = (i, size) => `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${MASCOTS[i].name}">${MASCOTS[i].svg}</svg>`;

/* ---------- 저장 ---------- */
const fresh = () => ({
  v: 1, createdAt: today(), seq: 1,
  habits: [], tasks: [], habitLog: {}, restDays: {}, ledger: {}, missions: {}, lastSettled: null,
  library: [], diary: {},
});
let S = load();
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return Object.assign(fresh(), JSON.parse(raw)); } catch (e) { /* 손상된 데이터는 새로 시작 */ }
  return fresh();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { flash('저장 공간이 부족해요'); } }
const uid = () => (S.seq++).toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- 사진·영상 (IndexedDB, 이 기기에만) ---------- */
const idb = (() => {
  let p;
  const db = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('jinseonmi', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('blobs');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('blobs', mode); const req = fn(t.objectStore('blobs'));
      t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error);
    });
  };
  return { get: (k) => run('readonly', (s) => s.get(k)), set: (k, v) => run('readwrite', (s) => s.put(v, k)), del: (k) => run('readwrite', (s) => s.delete(k)) };
})();
const urls = {};
const loading = {};
function blobUrl(key) {
  if (urls[key] !== undefined) return urls[key];
  if (!loading[key]) {
    loading[key] = idb.get(key).then((b) => { urls[key] = b ? URL.createObjectURL(b) : null; render(); }).catch(() => { urls[key] = null; });
  }
  return undefined;
}

/* ---------- 계산 ---------- */
const habitsOn = (d) => S.habits.filter((h) => h.createdAt <= d);
const isDone = (hid, d) => !!(S.habitLog[d] && S.habitLog[d][hid]);
const isRest = (d) => !!S.restDays[d];
const tasksOn = (d) => S.tasks.filter((t) => t.date === d);

function dayRate(d) {
  const hs = isRest(d) ? [] : habitsOn(d);
  const ts = tasksOn(d);
  const done = hs.filter((h) => isDone(h.id, d)).length + ts.filter((t) => t.done).length;
  return { done, total: hs.length + ts.length };
}
function streakEnding(h, d) {
  let n = 0;
  for (let i = 0; i < 2000 && d >= h.createdAt; i++, d = addDays(d, -1)) {
    if (isRest(d)) continue;
    if (isDone(h.id, d)) n++; else break;
  }
  return n;
}
function currentStreak(h) {
  const t = today();
  return isDone(h.id, t) ? streakEnding(h, t) : streakEnding(h, addDays(t, -1));
}
function missRun(h, d) {
  let n = 0;
  for (let i = 0; i < 2000 && d >= h.createdAt; i++, d = addDays(d, -1)) {
    if (isRest(d)) continue;
    if (!isDone(h.id, d)) n++; else break;
  }
  return n;
}
function bestStreak(h) {
  let best = 0, run = 0;
  for (let d = h.createdAt, t = today(); d <= t; d = addDays(d, 1)) {
    if (isRest(d)) continue;
    if (isDone(h.id, d)) { run++; best = Math.max(best, run); } else if (d < t) run = 0;
  }
  return best;
}

/* 지난 날짜를 정산: 하루 100%, 7일 연속, 3일 미수행, 회복 미션 */
function settleDay(d) {
  const r = dayRate(d);
  if (r.total > 0 && r.done === r.total) S.ledger['full:' + d] = { d, pts: PTS.full, label: '하루 목표 100%' };
  for (const h of habitsOn(d)) {
    if (isDone(h.id, d)) {
      const s = streakEnding(h, d);
      if (s > 0 && s % 7 === 0) S.ledger[`s7:${h.id}:${d}`] = { d, pts: PTS.streak7, label: `${h.name} ${s}일 연속`, cat: h.cat };
      const m = S.missions[h.id];
      if (m && m.date === d) { S.ledger[`rec:${h.id}:${d}`] = { d, pts: PTS.recover, label: `회복 미션 성공 · ${h.name}` }; delete S.missions[h.id]; }
    } else if (!isRest(d)) {
      const miss = missRun(h, d);
      if (miss > 0 && miss % 3 === 0) {
        S.ledger[`m3:${h.id}:${d}`] = { d, pts: PTS.miss3, label: `${h.name} ${miss}일 미수행` };
        S.missions[h.id] = { hid: h.id, date: addDays(d, 1) };
      }
    }
    const left = S.missions[h.id];
    if (left && left.date <= d) delete S.missions[h.id]; // 그날 못 하면 미션 종료
  }
}
function settle() {
  const t = today();
  let d = S.lastSettled ? addDays(S.lastSettled, 1) : S.createdAt;
  let guard = 0;
  while (d < t && guard++ < 4000) { settleDay(d); S.lastSettled = d; d = addDays(d, 1); }
  for (const [hid, m] of Object.entries(S.missions)) if (m.date < t || !S.habits.some((h) => h.id === hid)) delete S.missions[hid];
  save();
}
/* 오늘 실시간 보너스 (내일 아침 확정) */
function live() {
  const t = today(); const out = [];
  const r = dayRate(t);
  const full = r.total > 0 && r.done === r.total;
  if (full) out.push({ d: t, pts: PTS.full, label: '하루 목표 100%', key: 'full' });
  for (const h of habitsOn(t)) {
    if (!isDone(h.id, t)) continue;
    const s = streakEnding(h, t);
    if (s > 0 && s % 7 === 0) out.push({ d: t, pts: PTS.streak7, label: `${h.name} ${s}일 연속`, cat: h.cat, key: 's7' });
    const m = S.missions[h.id];
    if (m && m.date === t) out.push({ d: t, pts: PTS.recover, label: `회복 미션 성공 · ${h.name}`, key: 'rec' });
  }
  return { full, items: out, pts: out.reduce((a, b) => a + b.pts, 0) };
}
const totalPoints = () => Object.values(S.ledger).reduce((a, b) => a + b.pts, 0) + live().pts;
const restUsedThisMonth = () => { const p = today().slice(0, 7); return Object.keys(S.restDays).filter((d) => d.startsWith(p)).length; };

/* ---------- 유틸 ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const I = {
  check: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
  flame: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E2732B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2.5-5 .5 1.5 1.5 2 2.5 2 0-2.5-1-4.5 0-7z"/></svg>',
  camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  video: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/></svg>',
  doc: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h4"/></svg>',
  link: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  gift: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M12 9v11M3.5 13h17M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"/></svg>',
  shield: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/></svg>',
  nav: {
    today: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M9 20v-6h6v6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    habits: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',
    stats: '<path d="M5 20V11M12 20V5M19 20v-7"/>',
    library: '<path d="M6 3.5h12v17l-6-4-6 4z"/>',
  },
};

/* ---------- 화면 상태 ---------- */
const ui = {
  view: (location.hash.slice(1) || 'today'),
  habitFilter: 'all', statTab: '일',
  calSel: today(), calMonth: today().slice(0, 7),
  libTab: '전체', libCat: '대화법', newCat: 'jin',
  undo: null, flash: '',
};
const NAV = [['today', '오늘'], ['calendar', '캘린더'], ['habits', '습관'], ['stats', '성취율'], ['library', '보관함']];

function go(view) { ui.view = view; history.replaceState(null, '', '#' + view); render(); window.scrollTo(0, 0); }
let flashTimer;
function flash(msg) { ui.flash = msg; render(); clearTimeout(flashTimer); flashTimer = setTimeout(() => { ui.flash = ''; render(); }, 2200); }

/* ---------- 렌더 ---------- */
const footer = '<footer class="footer">Crafted By. Hannah T</footer>';
function render() {
  const app = document.getElementById('app');
  const views = { today: vToday, calendar: vCalendar, habits: vHabits, stats: vStats, library: vLibrary, challenge: vChallenge, friends: vFriends };
  const fn = views[ui.view] || vToday;
  const active = document.activeElement;
  const keep = active && active.id && app.contains(active) ? { id: active.id, s: active.selectionStart, e: active.selectionEnd } : null;
  app.innerHTML = fn() + (ui.flash ? `<div class="toast" role="status" style="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom));z-index:30;box-shadow:var(--shadow)">${esc(ui.flash)}</div>` : '') + footer;
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (e) { /* 일부 입력칸 제외 */ } } }
  document.getElementById('nav').innerHTML = `<div class="bar">${NAV.map(([k, l]) => `<button data-act="go" data-view="${k}" class="${ui.view === k ? 'on' : ''}" ${ui.view === k ? 'aria-current="page"' : ''}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I.nav[k]}</svg>${l}</button>`).join('')}</div>`;
}

/* 오늘 */
function itemRow(o) {
  const c = CATS[o.cat];
  const checkStyle = o.done ? `background:${c.strong};border-color:${c.strong}` : '';
  let action = '';
  if (o.done) action = `<button class="mini" data-act="${o.kind === 'habit' ? 'toggleHabit' : 'toggleTask'}" data-id="${o.id}">체크 취소</button>`;
  else if (o.kind === 'task' && o.overdue) action = `<button class="mini" data-act="toToday" data-id="${o.id}">오늘로</button>`;
  else if (o.kind === 'task') action = `<button class="mini" data-act="postpone" data-id="${o.id}">내일로 →</button>`;
  return `<div class="item ${o.done ? 'done' : ''}">
    <button class="check" style="${checkStyle}" data-act="${o.kind === 'habit' ? 'toggleHabit' : 'toggleTask'}" data-id="${o.id}" aria-pressed="${o.done}" aria-label="${esc(o.label)} ${o.done ? '완료됨' : '완료 체크'}">${o.done ? I.check : ''}</button>
    <button class="label" data-act="${o.kind === 'habit' ? 'habitMenu' : 'taskMenu'}" data-id="${o.id}"><span class="t">${esc(o.label)}</span><span class="meta">${o.kind === 'habit' ? `<span class="tag" style="background:${c.tint};color:${c.ink}">습관</span>` : ''}${esc(o.meta)}</span></button>
    ${action}
  </div>`;
}
function vToday() {
  const t = today(); const lv = live(); const r = dayRate(t);
  const pct = r.total ? Math.round(r.done / r.total * 100) : 0;
  const mi = mascotIndex(); const m = MASCOTS[mi];
  const prof = blobUrl('profile');
  const avatar = prof ? `<button class="avatar" data-act="pickProfile" aria-label="프로필 사진 바꾸기"><img src="${prof}" alt="내 프로필 사진"></button>`
    : `<button class="avatar empty" data-act="pickProfile" aria-label="프로필 사진 넣기">${I.camera}내 사진</button>`;
  const rest = isRest(t);
  const byCat = {};
  for (const k of CAT_KEYS) {
    const list = [];
    for (const h of habitsOn(t).filter((h) => h.cat === k)) {
      const done = isDone(h.id, t); const s = currentStreak(h);
      const miss = missRun(h, addDays(t, -1));
      list.push({ kind: 'habit', id: h.id, cat: k, label: h.name, done, meta: rest ? '쉬는 날 · 기록은 지켜져요' : S.missions[h.id] ? '회복 미션 중 · 오늘 하면 +25P' : s > 0 ? `매일 · ${s}일 연속` : miss > 0 ? `매일 · ${miss}일째 쉬는 중` : '매일' });
    }
    for (const x of S.tasks.filter((x) => x.cat === k && x.date < t && !x.done)) list.push({ kind: 'task', id: x.id, cat: k, label: x.title, done: false, overdue: true, meta: `밀린 일 · ${md(x.date)}` });
    for (const x of tasksOn(t).filter((x) => x.cat === k)) list.push({ kind: 'task', id: x.id, cat: k, label: x.title, done: x.done, meta: x.moved ? `${x.moved}번 미룬 일` : '오늘' });
    const hs = rest ? [] : habitsOn(t).filter((h) => h.cat === k); const ts = tasksOn(t).filter((x) => x.cat === k);
    byCat[k] = { list, done: hs.filter((h) => isDone(h.id, t)).length + ts.filter((x) => x.done).length, total: hs.length + ts.length };
  }
  const left = r.total - r.done;
  const cheer = r.total === 0 ? '오늘 할 일을 하나 적어볼까요?' : lv.full ? `오늘 목표 완료! +${PTS.full}P` : `남은 ${left}개만 하면 +${PTS.full}P!`;
  const circ = 2 * Math.PI * 38;
  const diary = S.diary[t] || { mood: '', text: '', media: [] };
  return `
  <header class="top">
    <div class="row" style="gap:12px">${avatar}
      <div class="col"><span class="small muted">${longDate(t)}</span><h1>한나의 진·선·미</h1></div>
    </div>
    <div class="col" style="align-items:center">
      <button class="mascot-btn" data-act="go" data-view="friends" aria-label="오늘의 친구 ${m.name} 보기">${mascotFor(mi, 64)}</button>
      <button class="points-pill" style="border:none" data-act="go" data-view="challenge">${totalPoints().toLocaleString('ko-KR')}P</button>
    </div>
  </header>

  <section class="summary" aria-label="오늘 달성률">
    <div class="ring"><svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true"><circle cx="44" cy="44" r="38" fill="#5A4234" stroke="#5A4234" stroke-width="8"/><circle cx="44" cy="44" r="38" fill="none" stroke="#F2A97E" stroke-width="8" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct / 100)}" style="transition:stroke-dashoffset .4s"/></svg>
      <div class="val"><b>${pct}%</b><span>오늘 달성</span></div></div>
    <div class="bars">
      ${CAT_KEYS.map((k) => { const b = byCat[k]; const p = b.total ? b.done / b.total * 100 : 0; return `<div class="bar-row"><span class="k" style="color:${CATS[k].light}">${CATS[k].ko}</span><div class="track"><i style="width:${p}%;background:${CATS[k].bar}"></i></div><span class="n">${b.done}/${b.total}</span></div>`; }).join('')}
      <span class="cheer">${esc(m.name)}: ${esc(cheer)}</span>
    </div>
  </section>

  ${lv.full ? `<div class="celebrate">${mascotFor(mi, 52)}<div class="col grow"><span class="hand" style="font-size:22px;color:var(--gold-dark)">오늘 목표 100% 달성!</span><span class="small" style="color:var(--gold)">+${PTS.full}P가 쌓였어요 · ${esc(m.name)}도 신났어요</span></div></div>` : ''}
  ${rest ? `<div class="toast"><span>오늘은 쉬는 날이에요. 습관 연속 기록이 지켜져요</span><button class="mini" data-act="toggleRest">취소</button></div>` : ''}
  ${ui.undo ? `<div class="toast"><span>‘${esc(ui.undo.title)}’ → 내일로 옮겼어요</span><button class="mini" style="background:var(--peach);color:var(--primary)" data-act="undoPostpone">되돌리기</button></div>` : ''}

  ${CAT_KEYS.map((k) => { const c = CATS[k]; return `
  <section class="banner" style="background:${c.tint}" aria-label="${c.ko} 영역">
    <div class="banner-head">
      <div class="banner-title" style="color:${c.ink}"><b>${c.ko} ${c.han}</b><span>${c.sub}</span></div>
      <button class="icon-btn" style="color:${c.ink}" data-act="addTask" data-cat="${k}" aria-label="${c.ko} 영역에 할 일 추가">${I.plus}</button>
    </div>
    ${byCat[k].list.length ? byCat[k].list.map(itemRow).join('') : `<div class="empty">+ 를 눌러 오늘의 ${c.ko}을 적어보세요</div>`}
  </section>`; }).join('')}

  <section class="card" aria-label="오늘의 기록">
    <div class="row between"><h2>오늘의 기록</h2><span class="small muted">일기 · 사진 · 영상</span></div>
    <div class="moods" role="group" aria-label="오늘 기분">${MOODS.map((x) => `<button class="mood ${diary.mood === x ? 'on' : ''}" data-act="mood" data-mood="${x}" aria-pressed="${diary.mood === x}">${x}</button>`).join('')}</div>
    <label class="lbl" for="diary-text">한 줄 일기</label>
    <textarea id="diary-text" class="field" rows="3" placeholder="오늘 어땠어요? 짧게 남겨봐요">${esc(diary.text)}</textarea>
    <div class="media-grid">
      ${(diary.media || []).map((md2) => { const u = blobUrl('m:' + md2.id); return `<button class="tile" data-act="viewMedia" data-id="${md2.id}" aria-label="${md2.type === 'video' ? '영상' : '사진'} 보기">${u ? (md2.type === 'video' ? `<video src="${u}#t=0.1" muted playsinline preload="metadata"></video><span class="badge">영상</span>` : `<img src="${u}" alt="오늘 첨부한 사진">`) : (md2.type === 'video' ? I.video : I.camera)}</button>`; }).join('')}
      <button class="tile add" data-act="addMedia">${I.plus}사진·영상</button>
    </div>
  </section>`;
}

/* 캘린더 */
function vCalendar() {
  const [y, mo] = ui.calMonth.split('-').map(Number);
  const first = new Date(y, mo - 1, 1); const days = new Date(y, mo, 0).getDate();
  const t = today(); const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push('<span></span>');
  for (let n = 1; n <= days; n++) {
    const d = `${y}-${pad(mo)}-${pad(n)}`;
    const cats = [...new Set(tasksOn(d).map((x) => x.cat))];
    const dow = new Date(y, mo - 1, n).getDay();
    const color = d === ui.calSel ? '' : dow === 0 ? 'color:#B5483F' : dow === 6 ? 'color:#3E7FA3' : '';
    cells.push(`<button class="day ${d === t ? 'today' : ''} ${d === ui.calSel ? 'sel' : ''} ${d < t ? 'past' : ''}" data-act="calPick" data-date="${d}" aria-label="${mo}월 ${n}일 ${WK[dow]}요일${cats.length ? ', 할 일 있음' : ''}"><span class="num" style="${color}">${n}</span><span class="dots">${cats.map((k) => `<i style="background:${CATS[k].strong}"></i>`).join('')}</span></button>`);
  }
  const sel = ui.calSel; const diff = Math.round((parse(sel) - parse(t)) / 864e5);
  const tag = diff === 0 ? '오늘' : diff === 1 ? '내일' : diff === 2 ? '모레' : diff > 0 ? `${diff}일 뒤` : `${-diff}일 전`;
  const list = tasksOn(sel);
  const dl = S.diary[sel];
  return `
  <header class="top"><h1>${y}년 ${mo}월</h1>
    <div class="row" style="gap:6px"><button class="icon-btn" data-act="calMonth" data-d="-1" aria-label="이전 달">${I.left}</button><button class="icon-btn" data-act="calMonth" data-d="1" aria-label="다음 달">${I.right}</button></div></header>
  <section class="card" style="padding:14px 10px">
    <div class="cal-grid">${WK.map((w, i) => `<span class="wk" style="${i === 0 ? 'color:#B5483F' : i === 6 ? 'color:#3E7FA3' : ''}">${w}</span>`).join('')}${cells.join('')}</div>
    <div class="row xs muted" style="justify-content:center;gap:14px">${CAT_KEYS.map((k) => `<span class="row" style="gap:4px"><i style="width:8px;height:8px;border-radius:50%;background:${CATS[k].strong}"></i>${CATS[k].ko}</span>`).join('')}</div>
  </section>
  <section class="card">
    <div class="row between"><h2>${longDate(sel)}</h2><span class="small muted">${tag} · ${list.length}개</span></div>
    ${list.length ? list.map((x) => { const c = CATS[x.cat]; return `<div class="item" style="background:${c.tint}"><span class="hand" style="font-size:18px;width:22px;color:${c.ink}">${c.ko}</span><button class="label" data-act="taskMenu" data-id="${x.id}"><span class="t" style="${x.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(x.title)}</span></button><button class="icon-btn sm" style="background:rgba(255,255,255,.75)" data-act="delTask" data-id="${x.id}" aria-label="${esc(x.title)} 삭제">${I.x}</button></div>`; }).join('') : '<div class="empty" style="background:var(--field)">아직 계획이 없어요. 아래에서 미리 적어두세요</div>'}
    ${S.habits.length ? `<span class="xs muted">습관 ${S.habits.length}개는 매일 자동으로 들어가요</span>` : ''}
    ${dl && (dl.text || dl.mood) ? `<div class="empty" style="background:var(--field);text-align:left">${dl.mood ? `<b>${esc(dl.mood)}</b> · ` : ''}${esc(dl.text)}</div>` : ''}
    <form data-form="calAdd" class="col" style="gap:10px;border-top:1px dashed var(--line);padding-top:12px">
      <label class="lbl" for="cal-title">이 날 할 일 미리 추가</label>
      <input id="cal-title" name="title" class="field" placeholder="예: 헬스장 등록 상담" autocomplete="off" required>
      <div class="cats" role="radiogroup" aria-label="영역">${CAT_KEYS.map((k) => catOpt(k, ui.newCat === k, 'setNewCat')).join('')}<button class="btn" style="flex:1.4" type="submit">추가</button></div>
    </form>
  </section>`;
}
const catOpt = (k, on, act) => `<button type="button" class="cat-opt" role="radio" aria-checked="${on}" data-act="${act}" data-cat="${k}" style="color:${CATS[k].ink};${on ? `background:${CATS[k].tint};border-color:${CATS[k].strong}` : ''}">${CATS[k].ko}</button>`;

/* 습관 */
function vHabits() {
  const t = today();
  const list = S.habits.filter((h) => ui.habitFilter === 'all' || h.cat === ui.habitFilter);
  const card = (h) => {
    const c = CATS[h.cat]; const s = currentStreak(h); const missY = missRun(h, addDays(t, -1)); const doneT = isDone(h.id, t);
    let pill, pc;
    if (S.missions[h.id]) { pill = '회복 미션 진행 중'; pc = ['var(--bad-bg)', 'var(--bad)']; }
    else if (!doneT && missY > 0 && (missY + 1) % 3 === 0 && !isRest(t)) { pill = '오늘 안 하면 패널티'; pc = ['var(--warn-bg)', 'var(--warn)']; }
    else if (s > 0 && s % 7 === 0 && doneT) { pill = `${s}일 달성 +${PTS.streak7}P`; pc = ['#E3EED9', '#3F6B26']; }
    else if (s > 0 && 7 - (s % 7) <= 2) { pill = `7일 스탬프까지 D-${7 - (s % 7)}`; pc = ['var(--gold-bg)', 'var(--gold)']; }
    else { pill = doneT ? '오늘 완료' : '순항 중'; pc = ['var(--soft)', '#5C4536']; }
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(t, -i); const pre = d < h.createdAt; const done = isDone(h.id, d); const rest = isRest(d);
      const lbl = i === 0 ? '오늘' : WK[parse(d).getDay()];
      const st = done ? `background:${c.strong};border-color:${c.strong};color:#fff` : i === 0 ? 'border-color:var(--primary)' : rest ? 'background:var(--peach);border-color:var(--peach);color:var(--primary)' : pre ? 'opacity:.35' : 'background:var(--soft);border-color:var(--soft)';
      week.push(`<span class="d"><i style="${st}" aria-label="${lbl} ${done ? '완료' : rest ? '쉬는 날' : '미완료'}">${done ? '✓' : rest ? '쉼' : !pre && i > 0 ? '·' : ''}</i>${lbl}</span>`);
    }
    return `<article class="card" style="gap:10px">
      <div class="row"><span class="badge-cat" style="background:${c.tint};color:${c.ink}">${c.ko}</span>
        <div class="col grow"><b style="font-size:15px">${esc(h.name)}</b><span class="small muted">매일 · 오늘 할 일에 자동 추가</span></div>
        <button class="icon-btn sm" data-act="editHabit" data-id="${h.id}" aria-label="${esc(h.name)} 수정">${I.edit}</button>
        <button class="icon-btn sm" data-act="delHabit" data-id="${h.id}" aria-label="${esc(h.name)} 삭제">${I.trash}</button></div>
      <div class="week">${week.join('')}</div>
      <div class="row between"><span class="row" style="gap:4px;font-weight:700;font-size:13px">${I.flame}${s > 0 ? `${s}일 연속` : missY > 0 ? `${missY}일째 쉬는 중` : '오늘부터 시작'}</span><span class="pill" style="background:${pc[0]};color:${pc[1]}">${pill}</span></div>
    </article>`;
  };
  return `
  <header class="top"><div class="col"><span class="small muted">매일 자동으로 오늘 할 일에 들어가요</span><h1>나의 습관</h1></div>
    <button class="btn" data-act="addHabit">+ 새 습관</button></header>
  <section style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div class="rule" style="background:var(--gold-bg);color:var(--gold)"><b class="small">7일 연속 성공</b><span class="hand" style="font-size:24px;color:var(--gold-dark)">+${PTS.streak7}P</span><span class="small">연속 스탬프 1개</span></div>
    <div class="rule" style="background:var(--warn-bg);color:var(--warn)"><b class="small">3일 연속 미수행</b><span class="hand" style="font-size:24px;color:#6E2F05">${PTS.miss3}P</span><span class="small">회복 미션 성공 시 +${PTS.recover}P</span></div>
  </section>
  <div class="row" role="group" aria-label="영역 필터" style="gap:8px">${[['all', '전체'], ...CAT_KEYS.map((k) => [k, CATS[k].ko])].map(([k, l]) => `<button class="chip ${ui.habitFilter === k ? 'on' : ''}" ${ui.habitFilter === k && k !== 'all' ? `style="background:${CATS[k].strong}"` : ''} data-act="habitFilter" data-k="${k}" aria-pressed="${ui.habitFilter === k}">${l}</button>`).join('')}</div>
  ${list.length ? list.map(card).join('') : `<div class="card" style="align-items:center;text-align:center">${mascotFor(mascotIndex(), 72)}<span class="muted">${S.habits.length ? '이 영역에는 아직 습관이 없어요' : '첫 습관을 만들어볼까요? 매일 오늘 할 일에 자동으로 들어가요'}</span><button class="btn" data-act="addHabit">+ 새 습관</button>${S.habits.length ? '' : '<button class="btn ghost" data-act="seedHabits">예시 습관 3개 넣어보기</button>'}</div>`}`;
}

/* 성취율 */
function habitRate(from, to, fn = () => true) {
  let done = 0, total = 0; const t = today();
  for (let d = from; d <= to && d <= t; d = addDays(d, 1)) {
    if (isRest(d)) continue;
    for (const h of habitsOn(d)) if (fn(h)) { total++; if (isDone(h.id, d)) done++; }
  }
  return total ? Math.round(done / total * 100) : null;
}
function allRate(from, to, fn = () => true) {
  let done = 0, total = 0; const t = today();
  for (let d = from; d <= to && d <= t; d = addDays(d, 1)) {
    if (!isRest(d)) for (const h of habitsOn(d)) if (fn(h.cat)) { total++; if (isDone(h.id, d)) done++; }
    for (const x of tasksOn(d)) if (fn(x.cat)) { total++; if (x.done) done++; }
  }
  return total ? Math.round(done / total * 100) : null;
}
function monthStart(offset) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - offset); return ymd(d); }
function monthEnd(offset) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - offset + 1); d.setDate(0); return ymd(d); }
function windowFor(tab, back = 0) {
  const t = today();
  if (tab === '일') { const d = addDays(t, -back); return { from: d, to: d }; }
  if (tab === '주') return { from: addDays(t, -6 - 7 * back), to: addDays(t, -7 * back) };
  if (tab === '월') return { from: addDays(t, -27 - 28 * back), to: addDays(t, -28 * back) };
  const n = { '3개월': 3, '6개월': 6, '1년': 12 }[tab];
  return { from: monthStart(n - 1 + n * back), to: back ? monthEnd(n * back) : t };
}
function vStats() {
  const tab = ui.statTab; const t = today(); const w = windowFor(tab); const prev = windowFor(tab, 1);
  const isDay = tab === '일';
  const rate = isDay ? allRate(w.from, w.to) : habitRate(w.from, w.to);
  const prevRate = isDay ? allRate(prev.from, prev.to) : habitRate(prev.from, prev.to);
  let bars = [];
  if (isDay || tab === '주') for (let i = 6; i >= 0; i--) { const d = addDays(t, -i); bars.push({ l: i === 0 ? '오늘' : WK[parse(d).getDay()], v: isDay ? allRate(d, d) : habitRate(d, d) }); }
  else if (tab === '월') for (let i = 3; i >= 0; i--) { const to = addDays(t, -7 * i); bars.push({ l: `~${md(to)}`, v: habitRate(addDays(to, -6), to) }); }
  else { const n = { '3개월': 3, '6개월': 6, '1년': 12 }[tab]; for (let i = n - 1; i >= 0; i--) { const f = monthStart(i); bars.push({ l: `${parse(f).getMonth() + 1}월`, v: habitRate(f, i ? monthEnd(i) : t) }); } }
  const catRate = (k) => isDay ? allRate(w.from, w.to, (c) => c === k) : habitRate(w.from, w.to, (h) => h.cat === k);
  const rows = S.habits.map((h) => ({ h, v: habitRate(w.from, w.to, (x) => x.id === h.id) }));
  const ptsIn = Object.values(S.ledger).filter((e) => e.d >= w.from && e.d <= w.to);
  const plus = ptsIn.filter((e) => e.pts > 0).reduce((a, b) => a + b.pts, 0) + (w.to >= t ? live().pts : 0);
  const minus = ptsIn.filter((e) => e.pts < 0).reduce((a, b) => a + b.pts, 0);
  const best = S.habits.reduce((a, h) => Math.max(a, bestStreak(h)), 0);
  const r = dayRate(t);
  const range = isDay ? `오늘 · ${longDate(t)} (할 일 + 습관)` : `${md(w.from)} – ${md(w.to)} (습관)`;
  const delta = rate === null ? '아직 기록이 없어요' : prevRate === null ? '첫 기록이에요' : `이전보다 ${rate - prevRate >= 0 ? '+' : ''}${rate - prevRate}%p`;
  return `
  <header class="col"><span class="small muted">${isDay ? '오늘 목표 전체 기준' : '습관 영역 기준'}</span><h1>성취율</h1></header>
  <div class="tabs" role="tablist" aria-label="기간">${['일', '주', '월', '3개월', '6개월', '1년'].map((k) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-act="statTab" data-k="${k}">${k}</button>`).join('')}</div>
  <section class="summary" style="flex-direction:column;align-items:stretch;gap:14px">
    <div class="row between" style="align-items:flex-end"><div class="col"><span class="small" style="color:var(--cream-text)">${range}</span><span class="hand" style="font-size:52px;line-height:1">${rate ?? '–'}${rate === null ? '' : '%'}</span></div>
      <span class="pill" style="background:var(--dark2);color:#C3E0A6">${delta}</span></div>
    <div class="chart">${bars.map((b) => `<div class="b"><span>${b.v ?? ''}</span><i style="height:${b.v ? b.v * 1.15 : 3}px;background:${b.v === null ? 'var(--dark2)' : b.v >= 80 ? '#C3E0A6' : b.v >= 50 ? '#F2A97E' : '#F7B8AE'}"></i></div>`).join('')}</div>
    <div class="chart-l" style="margin-top:-8px">${bars.map((b) => `<span>${b.l}</span>`).join('')}</div>
  </section>
  <section class="trio">${CAT_KEYS.map((k) => { const c = CATS[k]; const v = catRate(k); return `<div style="background:${c.tint};color:${c.ink}"><span class="hand" style="font-size:18px">${c.ko}</span><span class="hand" style="font-size:28px">${v ?? '–'}${v === null ? '' : '%'}</span><span class="xs">${c.sub.split(' · ').slice(0, 2).join(' · ')}</span></div>`; }).join('')}</section>
  <section class="card"><b style="font-size:14px">습관별 달성률</b>
    ${rows.length ? rows.map(({ h, v }) => { const c = CATS[h.cat]; return `<div class="row" style="font-size:13px"><span class="hand" style="width:20px;font-size:16px;color:${c.ink}">${c.ko}</span><span style="width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(h.name)}</span><div class="track grow" style="background:var(--soft);height:10px"><i style="height:10px;width:${v ?? 0}%;background:${c.strong}"></i></div><b style="width:40px;text-align:right">${v ?? '–'}${v === null ? '' : '%'}</b></div>`; }).join('') : '<span class="small muted">습관을 만들면 여기서 달성률을 볼 수 있어요</span>'}
  </section>
  <section style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div class="rule" style="background:var(--gold-bg)"><span class="xs" style="font-weight:700;color:var(--gold)">${isDay ? '오늘 완료한 목표' : '최장 연속 기록'}</span><span class="hand" style="font-size:24px;color:var(--gold-dark)">${isDay ? `${r.done} / ${r.total}개` : `${best}일`}</span></div>
    <div class="rule" style="background:#fff"><span class="xs muted" style="font-weight:700">${isDay ? '하루 완주 보너스' : '쌓은 / 잃은 포인트'}</span><span class="hand" style="font-size:24px">${isDay ? (live().full ? `+${PTS.full}P 획득` : `100%면 +${PTS.full}P`) : `+${plus} / ${minus}`}</span></div>
  </section>`;
}

/* 보관함 */
function vLibrary() {
  const items = S.library.filter((x) => ui.libTab === '전체' || x.cat === ui.libTab);
  const doneN = S.library.filter((x) => x.done).length;
  return `
  <header class="col"><span class="small muted">${S.library.length}개 중 ${doneN}개 봤어요</span><h1>나중에 볼 것</h1></header>
  <form class="card" data-form="libAdd">
    <label class="lbl" for="lib-url">링크 붙여넣기</label>
    <div class="row" style="gap:8px"><div class="row grow field" style="gap:8px;padding:0 12px">${I.link}<input id="lib-url" name="url" type="url" inputmode="url" placeholder="https://" style="flex:1;min-width:0;border:none;background:none;height:44px;font-size:15px;outline:none" required autocomplete="off"></div>
      <button class="btn" type="submit">저장</button></div>
    <input name="title" class="field" placeholder="제목 (비우면 주소로 저장)" aria-label="제목" autocomplete="off">
    <div class="row" style="gap:6px" role="radiogroup" aria-label="분류">${Object.keys(LIB).map((k) => `<button type="button" class="chip" role="radio" aria-checked="${ui.libCat === k}" data-act="libCat" data-k="${k}" style="min-height:36px;color:${LIB[k][1]};border:2px solid ${ui.libCat === k ? LIB[k][1] : 'var(--line)'};background:${ui.libCat === k ? LIB[k][0] : '#fff'}">${k}</button>`).join('')}</div>
  </form>
  <div class="row" role="tablist" aria-label="분류 보기" style="gap:8px;flex-wrap:wrap">${['전체', ...Object.keys(LIB)].map((k) => `<button role="tab" aria-selected="${ui.libTab === k}" class="chip ${ui.libTab === k ? 'on' : ''}" data-act="libTab" data-k="${k}">${k} <span style="opacity:.75;font-weight:400">${S.library.filter((x) => k === '전체' || x.cat === k).length}</span></button>`).join('')}</div>
  ${items.length ? items.map((x) => { const [tint, ink] = LIB[x.cat] || LIB['대화법']; return `<article class="card lib-item ${x.done ? 'done' : ''}" style="flex-direction:row;padding:12px 12px 12px 14px">
      <button class="check" style="${x.done ? 'background:var(--primary);border-color:var(--primary)' : ''}" data-act="libToggle" data-id="${x.id}" aria-pressed="${x.done}" aria-label="${esc(x.title)} 봤어요">${x.done ? I.check : ''}</button>
      <span class="lib-icon" style="background:${tint};color:${ink}">${x.video ? I.video : I.doc}</span>
      <div class="col grow" style="gap:3px"><a class="lib-title" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a>
        <span class="xs muted row" style="gap:6px"><span class="tag" style="background:${tint};color:${ink}">${x.cat}</span>${esc(x.host)}</span></div>
      <button class="icon-btn sm" data-act="libMenu" data-id="${x.id}" aria-label="${esc(x.title)} 편집">${I.edit}</button>
    </article>`; }).join('') : `<div class="card" style="align-items:center;text-align:center">${mascotFor(mascotIndex(), 64)}<span class="muted small">대화법, 연애, 재테크 영상이나 글 링크를 저장해두세요</span></div>`}`;
}

/* 도전 & 회복 */
function vChallenge() {
  const t = today(); const lv = live(); const mi = mascotIndex();
  const p = t.slice(0, 7);
  const stamps = [...Object.values(S.ledger).filter((e) => e.pts === PTS.streak7 && e.cat && e.d.startsWith(p)), ...lv.items.filter((e) => e.key === 's7')];
  const missions = Object.values(S.missions).map((m) => ({ m, h: S.habits.find((h) => h.id === m.hid) })).filter((x) => x.h);
  const restLeft = REST_PER_MONTH - restUsedThisMonth();
  const hist = [...lv.items.map((e) => ({ ...e, live: true })), ...Object.values(S.ledger).sort((a, b) => (a.d < b.d ? 1 : -1))].slice(0, 12);
  return `
  <header class="row"><button class="icon-btn" data-act="go" data-view="today" aria-label="뒤로">${I.left}</button><h1>도전 & 회복</h1></header>
  <section class="summary" style="border-radius:30px">${mascotFor(mi, 72)}
    <div class="col grow" style="gap:4px"><span class="small" style="color:var(--cream-text)">모은 포인트</span><span class="hand" style="font-size:42px;line-height:1">${totalPoints().toLocaleString('ko-KR')}P</span>
      <span class="xs" style="color:var(--cream-text);line-height:1.5">하루 100% +${PTS.full}P · 7일 연속 +${PTS.streak7}P<br>3일 미수행 ${PTS.miss3}P · 회복 미션 +${PTS.recover}P</span></div></section>
  <section class="card row" style="flex-direction:row;border:2px dashed #D9C3AA;background:var(--field);box-shadow:none"><span style="color:var(--primary)">${I.gift}</span>
    <div class="col grow"><b style="font-size:14px">포인트로 받을 보상</b><span class="small muted">아직 정하지 않았어요 · 정하면 여기에 들어가요</span></div></section>
  <section class="card"><div class="row between"><h2>7일 연속 스탬프</h2><span class="small muted">이번 달 ${stamps.length}개</span></div>
    <div class="stamps">${Array.from({ length: Math.max(10, stamps.length) }, (_, i) => { const s = stamps[i]; if (!s) return '<i aria-hidden="true"></i>'; const c = CATS[s.cat]; return `<i style="border:2px solid ${c.ink};background:${c.tint};color:${c.ink}" title="${esc(s.label)}">${c.ko}</i>`; }).join('')}</div></section>
  <section class="card" style="border:2px solid #F7C9A8"><div class="row between"><h2 style="color:var(--warn)">회복 미션</h2>${missions.length ? `<span class="pill" style="background:var(--bad-bg);color:var(--bad)">${PTS.miss3}P 적용됨</span>` : ''}</div>
    ${missions.length ? missions.map(({ h }) => `<span class="small" style="line-height:1.6;color:#5C4536">‘${esc(h.name)}’를 3일 쉬었어요. <b style="color:var(--ink)">오늘 해내면</b> ${PTS.recover}P를 돌려받고 연속 기록이 다시 시작돼요.</span>
      <button class="btn" style="background:${isDone(h.id, t) ? '#5E8C3F' : '#A9542F'}" data-act="toggleHabit" data-id="${h.id}">${isDone(h.id, t) ? '미션 성공! (내일 아침 확정)' : '지금 하고 체크하기'}</button>`).join('') : '<span class="small muted">진행 중인 회복 미션이 없어요. 잘하고 있어요!</span>'}</section>
  <section class="card" style="background:var(--peach);box-shadow:none">
    <div class="row"><span class="icon-btn" style="color:var(--primary)">${I.shield}</span><div class="col grow"><b style="font-size:14px;color:#6E2F14">쉬는 날 쿠폰 ${restLeft}/${REST_PER_MONTH}</b><span class="small" style="color:var(--primary-dark)">아픈 날, 여행 가는 날엔 연속 기록을 지켜줘요</span></div></div>
    <button class="btn light" data-act="toggleRest" ${!isRest(t) && restLeft <= 0 ? 'disabled' : ''}>${isRest(t) ? '오늘 쉬는 날 취소하기' : restLeft > 0 ? '오늘 쉬는 날로 쓰기' : '이번 달 쿠폰을 다 썼어요'}</button></section>
  <section class="card" style="background:var(--soft);box-shadow:none;flex-direction:row;align-items:center"><span class="small" style="color:#5C4536">‘내일로’ 미룬 일은 벌점도, 포인트도 없어요</span></section>
  <section class="card"><h2>포인트 기록</h2><div class="ledger">${hist.length ? hist.map((e) => `<div><span>${md(e.d)} · ${esc(e.label)}${e.live ? ' <span class="xs muted">(진행 중)</span>' : ''}</span><b style="color:${e.pts > 0 ? '#3F6B26' : 'var(--bad)'}">${e.pts > 0 ? '+' : ''}${e.pts}P</b></div>`).join('') : '<span class="small muted">아직 기록이 없어요</span>'}</div></section>
  <section class="card"><h2>백업</h2><span class="small muted">기록은 이 폰에만 저장돼요. 폰을 바꿀 때 백업 파일로 옮기세요. (사진·영상은 포함되지 않아요)</span>
    <div class="row" style="gap:8px"><button class="btn ghost grow" data-act="exportData">백업 파일 저장</button><button class="btn ghost grow" data-act="importData">백업 불러오기</button></div></section>`;
}

/* 친구들 */
function vFriends() {
  const mi = mascotIndex();
  return `
  <header class="row"><button class="icon-btn" data-act="go" data-view="today" aria-label="뒤로">${I.left}</button><div class="col"><h1>매일 바뀌는 친구들</h1><span class="small muted">매일 아침 7시에 바뀌어요 · 내일은 ${MASCOTS[(mi + 1) % 10].name}</span></div></header>
  <div class="friends">${MASCOTS.map((m, i) => `<div class="friend ${i === mi ? 'today' : ''}">${mascotFor(i, 84)}<span class="hand" style="font-size:22px;line-height:1">${m.name}</span><span class="small muted">${m.desc}</span>${i === mi ? '<span class="pill" style="background:var(--primary);color:#fff;font-size:11px">오늘의 친구</span>' : ''}</div>`).join('')}</div>`;
}

/* ---------- 시트(팝업) ---------- */
function sheet(html) {
  const root = document.getElementById('sheet-root');
  root.innerHTML = `<div class="sheet-bg" data-act="closeSheet"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  const f = root.querySelector('input,textarea'); if (f) setTimeout(() => f.focus(), 60);
}
function closeSheet() { document.getElementById('sheet-root').innerHTML = ''; }
function confirmSheet(msg, act, id, yes = '삭제') {
  sheet(`<h2>${esc(msg)}</h2><div class="row" style="gap:8px"><button class="btn ghost grow" data-act="closeSheet">취소</button><button class="btn danger grow" data-act="${act}" data-id="${id}" data-confirm="1">${yes}</button></div>`);
}
let sheetCat = 'jin';
function taskSheet(task, cat) {
  sheetCat = task ? task.cat : cat;
  sheet(`<h2>${task ? '할 일 고치기' : `${CATS[cat].ko} 할 일 추가`}</h2>
  <form data-form="task" data-id="${task ? task.id : ''}" class="col" style="gap:10px">
    <label class="lbl" for="t-title">할 일</label><input id="t-title" name="title" class="field" value="${task ? esc(task.title) : ''}" placeholder="예: 보고서 초안 마무리" required autocomplete="off">
    <span class="lbl">영역</span><div class="cats" role="radiogroup" aria-label="영역">${CAT_KEYS.map((k) => catOpt(k, sheetCat === k, 'sheetCat')).join('')}</div>
    <label class="lbl" for="t-date">날짜</label><input id="t-date" name="date" type="date" class="field" value="${task ? task.date : today()}" required>
    <button class="btn" type="submit">${task ? '저장' : '추가'}</button>
    ${task ? `<button class="btn danger" type="button" data-act="delTask" data-id="${task.id}">삭제</button>` : ''}
  </form>`);
}
function habitSheet(h) {
  sheetCat = h ? h.cat : (ui.habitFilter !== 'all' ? ui.habitFilter : 'jin');
  sheet(`<h2>${h ? '습관 고치기' : '새 습관'}</h2>
  <form data-form="habit" data-id="${h ? h.id : ''}" class="col" style="gap:10px">
    <label class="lbl" for="h-name">습관 이름</label><input id="h-name" name="name" class="field" value="${h ? esc(h.name) : ''}" placeholder="예: 물 2L 마시기" required autocomplete="off">
    <span class="lbl">영역</span><div class="cats" role="radiogroup" aria-label="영역">${CAT_KEYS.map((k) => catOpt(k, sheetCat === k, 'sheetCat')).join('')}</div>
    <span class="small muted">매일 오늘 할 일의 ${'진·선·미'} 배너에 자동으로 들어가요</span>
    <button class="btn" type="submit">${h ? '저장' : '만들기'}</button>
  </form>`);
}

/* ---------- 동작 ---------- */
function setHabit(hid, d, val) { S.habitLog[d] = S.habitLog[d] || {}; if (val) S.habitLog[d][hid] = true; else { delete S.habitLog[d][hid]; if (!Object.keys(S.habitLog[d]).length) delete S.habitLog[d]; } }
function diaryOf(d) { return (S.diary[d] = S.diary[d] || { mood: '', text: '', media: [] }); }
function vibrate() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) { /* 미지원 */ } }

const actions = {
  go: (el) => go(el.dataset.view),
  toggleHabit: (el) => { const t = today(); const was = live().full; setHabit(el.dataset.id, t, !isDone(el.dataset.id, t)); vibrate(); save(); afterCheck(was); },
  toggleTask: (el) => { const x = S.tasks.find((y) => y.id === el.dataset.id); if (!x) return; const was = live().full; x.done = !x.done; if (x.done && x.date < today()) x.date = today(); vibrate(); save(); afterCheck(was); },
  postpone: (el) => { const x = S.tasks.find((y) => y.id === el.dataset.id); if (!x) return; ui.undo = { id: x.id, date: x.date, title: x.title, moved: x.moved || 0 }; x.date = addDays(x.date < today() ? today() : x.date, 1); x.moved = (x.moved || 0) + 1; save(); render(); },
  undoPostpone: () => { const u = ui.undo; const x = u && S.tasks.find((y) => y.id === u.id); if (x) { x.date = u.date; x.moved = u.moved; save(); } ui.undo = null; render(); },
  toToday: (el) => { const x = S.tasks.find((y) => y.id === el.dataset.id); if (x) { x.date = today(); save(); render(); } },
  addTask: (el) => taskSheet(null, el.dataset.cat),
  taskMenu: (el) => { const x = S.tasks.find((y) => y.id === el.dataset.id); if (x) taskSheet(x); },
  delTask: (el) => { if (!el.dataset.confirm) { const x = S.tasks.find((y) => y.id === el.dataset.id); return confirmSheet(`‘${x ? x.title : ''}’ 삭제할까요?`, 'delTask', el.dataset.id); } S.tasks = S.tasks.filter((y) => y.id !== el.dataset.id); save(); closeSheet(); render(); },
  sheetCat: (el) => { sheetCat = el.dataset.cat; el.parentElement.querySelectorAll('.cat-opt').forEach((b) => { const on = b.dataset.cat === sheetCat; const c = CATS[b.dataset.cat]; b.setAttribute('aria-checked', on); b.style.background = on ? c.tint : '#fff'; b.style.borderColor = on ? c.strong : 'var(--line)'; }); },
  setNewCat: (el) => { ui.newCat = el.dataset.cat; render(); },
  habitMenu: (el) => { const h = S.habits.find((y) => y.id === el.dataset.id); if (h) habitSheet(h); },
  addHabit: () => habitSheet(null),
  editHabit: (el) => habitSheet(S.habits.find((y) => y.id === el.dataset.id)),
  delHabit: (el) => { const h = S.habits.find((y) => y.id === el.dataset.id); if (!el.dataset.confirm) return confirmSheet(`‘${h ? h.name : ''}’ 습관을 삭제할까요? 기록도 함께 사라져요`, 'delHabit', el.dataset.id); S.habits = S.habits.filter((y) => y.id !== el.dataset.id); delete S.missions[el.dataset.id]; for (const d of Object.keys(S.habitLog)) { delete S.habitLog[d][el.dataset.id]; } save(); closeSheet(); render(); },
  seedHabits: () => { const t = today(); [['영어 단어 30개', 'jin'], ['부모님께 안부 연락', 'seon'], ['물 2L 마시기', 'mi']].forEach(([name, cat]) => S.habits.push({ id: uid(), name, cat, createdAt: t })); save(); render(); },
  habitFilter: (el) => { ui.habitFilter = el.dataset.k; render(); },
  statTab: (el) => { ui.statTab = el.dataset.k; render(); },
  calPick: (el) => { ui.calSel = el.dataset.date; render(); },
  calMonth: (el) => { const [y, m] = ui.calMonth.split('-').map(Number); const d = new Date(y, m - 1 + Number(el.dataset.d), 1); ui.calMonth = ymd(d).slice(0, 7); render(); },
  libCat: (el) => { ui.libCat = el.dataset.k; render(); },
  libTab: (el) => { ui.libTab = el.dataset.k; render(); },
  libToggle: (el) => { const x = S.library.find((y) => y.id === el.dataset.id); if (x) { x.done = !x.done; save(); render(); } },
  libMenu: (el) => { const x = S.library.find((y) => y.id === el.dataset.id); if (!x) return; sheet(`<h2>링크 고치기</h2><form data-form="libEdit" data-id="${x.id}" class="col" style="gap:10px"><label class="lbl" for="l-title">제목</label><input id="l-title" name="title" class="field" value="${esc(x.title)}" required><label class="lbl" for="l-cat">분류</label><select id="l-cat" name="cat" class="field">${Object.keys(LIB).map((k) => `<option ${k === x.cat ? 'selected' : ''}>${k}</option>`).join('')}</select><button class="btn" type="submit">저장</button><button class="btn danger" type="button" data-act="libDel" data-id="${x.id}">삭제</button></form>`); },
  libDel: (el) => { S.library = S.library.filter((y) => y.id !== el.dataset.id); save(); closeSheet(); render(); },
  mood: (el) => { const d = diaryOf(today()); d.mood = d.mood === el.dataset.mood ? '' : el.dataset.mood; save(); render(); },
  pickProfile: () => document.getElementById('profile-input').click(),
  addMedia: () => document.getElementById('media-input').click(),
  viewMedia: (el) => { const d = diaryOf(today()); const m = d.media.find((x) => x.id === el.dataset.id); if (!m) return; const u = urls['m:' + m.id]; sheet(`<div class="viewer">${m.type === 'video' ? `<video src="${u}" controls playsinline></video>` : `<img src="${u}" alt="첨부한 사진">`}</div><div class="row" style="gap:8px"><button class="btn ghost grow" data-act="closeSheet">닫기</button><button class="btn danger grow" data-act="delMedia" data-id="${m.id}">삭제</button></div>`); },
  delMedia: async (el) => { const d = diaryOf(today()); d.media = d.media.filter((x) => x.id !== el.dataset.id); save(); closeSheet(); render(); try { await idb.del('m:' + el.dataset.id); } catch (e) { /* 무시 */ } },
  toggleRest: () => { const t = today(); if (isRest(t)) delete S.restDays[t]; else if (restUsedThisMonth() < REST_PER_MONTH) S.restDays[t] = true; save(); render(); },
  exportData: () => { const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `jinseonmi-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); },
  importData: () => document.getElementById('backup-input').click(),
  closeSheet: (el, ev) => { if (ev.target === el) closeSheet(); },
};
function afterCheck(wasFull) {
  render();
  if (!wasFull && live().full) flash(`오늘 목표 100%! +${PTS.full}P`);
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'closeSheet') { if (ev.target === el || el.tagName === 'BUTTON') closeSheet(); return; }
  if (actions[act]) { ev.preventDefault(); actions[act](el, ev); }
});
document.addEventListener('submit', (ev) => {
  const f = ev.target; const kind = f.dataset.form; if (!kind) return;
  ev.preventDefault();
  const fd = new FormData(f); const v = (k) => String(fd.get(k) || '').trim();
  if (kind === 'task') {
    const title = v('title'); const date = v('date') || today(); if (!title) return;
    if (f.dataset.id) { const x = S.tasks.find((y) => y.id === f.dataset.id); if (x) Object.assign(x, { title, date, cat: sheetCat }); }
    else S.tasks.push({ id: uid(), title, cat: sheetCat, date, done: false });
    save(); closeSheet(); render();
  } else if (kind === 'calAdd') {
    const title = v('title'); if (!title) return;
    S.tasks.push({ id: uid(), title, cat: ui.newCat, date: ui.calSel, done: false }); save(); render();
    const inp = document.getElementById('cal-title'); if (inp) { inp.value = ''; inp.focus(); }
  } else if (kind === 'habit') {
    const name = v('name'); if (!name) return;
    if (f.dataset.id) { const h = S.habits.find((y) => y.id === f.dataset.id); if (h) Object.assign(h, { name, cat: sheetCat }); }
    else S.habits.push({ id: uid(), name, cat: sheetCat, createdAt: today() });
    save(); closeSheet(); render();
  } else if (kind === 'libAdd') {
    let url = v('url'); if (!url) return; if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    let host = url; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { /* 주소 그대로 */ }
    const video = /youtu|vimeo|tiktok|instagram\.com\/reel|tv\.naver|chzzk/i.test(url);
    S.library.unshift({ id: uid(), url, host, title: v('title') || host, cat: ui.libCat, video, done: false, at: today() });
    save(); render(); flash('보관함에 저장했어요');
  } else if (kind === 'libEdit') {
    const x = S.library.find((y) => y.id === f.dataset.id); if (x) { x.title = v('title') || x.title; x.cat = v('cat') || x.cat; }
    save(); closeSheet(); render();
  }
});
let diaryTimer;
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'diary-text') { diaryOf(today()).text = ev.target.value; clearTimeout(diaryTimer); diaryTimer = setTimeout(save, 250); }
});
document.getElementById('profile-input').addEventListener('change', async (ev) => {
  const file = ev.target.files[0]; ev.target.value = ''; if (!file) return;
  try { const small = await shrink(file, 512); await idb.set('profile', small); if (urls.profile) URL.revokeObjectURL(urls.profile); urls.profile = URL.createObjectURL(small); persist(); render(); } catch (e) { flash('사진을 저장하지 못했어요'); }
});
document.getElementById('media-input').addEventListener('change', async (ev) => {
  const files = [...ev.target.files]; ev.target.value = '';
  const d = diaryOf(today());
  for (const file of files) {
    const id = uid(); const type = file.type.startsWith('video') ? 'video' : 'image';
    try { const blob = type === 'image' ? await shrink(file, 1600) : file; await idb.set('m:' + id, blob); urls['m:' + id] = URL.createObjectURL(blob); d.media.push({ id, type }); } catch (e) { flash('파일이 너무 커서 저장하지 못했어요'); }
  }
  save(); persist(); render();
});
document.getElementById('backup-input').addEventListener('change', async (ev) => {
  const file = ev.target.files[0]; ev.target.value = ''; if (!file) return;
  try { const data = JSON.parse(await file.text()); if (!data || !Array.isArray(data.habits) || !Array.isArray(data.tasks)) throw new Error('bad'); S = Object.assign(fresh(), data); save(); settle(); render(); flash('백업을 불러왔어요'); } catch (e) { flash('백업 파일을 읽지 못했어요'); }
});
function shrink(file, max) {
  return new Promise((res) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      if (k === 1 && file.size < 1.5e6) { URL.revokeObjectURL(u); return res(file); }
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob((b) => res(b || file), 'image/jpeg', 0.86);
    };
    img.onerror = () => { URL.revokeObjectURL(u); res(file); };
    img.src = u;
  });
}
function persist() { try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* 미지원 */ } }

/* 날짜가 바뀌면(자정·오전 7시) 자동 정산·새로고침 */
let lastDay = today(), lastMascot = mascotIndex();
setInterval(() => { if (today() !== lastDay || mascotIndex() !== lastMascot) { lastDay = today(); lastMascot = mascotIndex(); ui.calSel = today(); settle(); render(); } }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && (today() !== lastDay || mascotIndex() !== lastMascot)) { lastDay = today(); lastMascot = mascotIndex(); settle(); render(); } });
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== ui.view) { ui.view = v; render(); } });

settle();
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
