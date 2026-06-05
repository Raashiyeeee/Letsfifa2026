'use strict';

/* ============================================================
   FIFA WORLD CUP 2026 — app.js
   Frame scrub hero + full schedule logic
   All times stored as IST (UTC+5:30)
   ============================================================ */

/* ── Hero Frame Config ───────────────────────────────────── */
// All 259 actual frames that exist in /home/blaze/Videos/fifiaa_frames/
// served through proxy at /frames/frame_NNN.jpg
const FRAME_FILES = [
  'frame_001.jpg','frame_002.jpg','frame_003.jpg','frame_004.jpg',
  'frame_006.jpg','frame_010.jpg','frame_013.jpg','frame_015.jpg',
  'frame_016.jpg','frame_017.jpg','frame_018.jpg','frame_019.jpg',
  'frame_021.jpg','frame_022.jpg','frame_023.jpg','frame_024.jpg',
  'frame_025.jpg','frame_026.jpg','frame_027.jpg','frame_028.jpg',
  'frame_029.jpg','frame_030.jpg','frame_032.jpg','frame_033.jpg',
  'frame_034.jpg','frame_037.jpg','frame_040.jpg','frame_044.jpg',
  'frame_047.jpg','frame_048.jpg','frame_053.jpg','frame_057.jpg',
  'frame_058.jpg','frame_064.jpg','frame_065.jpg','frame_069.jpg',
  'frame_071.jpg','frame_072.jpg','frame_075.jpg','frame_076.jpg',
  'frame_081.jpg','frame_084.jpg','frame_085.jpg','frame_086.jpg',
  'frame_095.jpg','frame_096.jpg','frame_098.jpg','frame_099.jpg',
  'frame_100.jpg','frame_101.jpg','frame_102.jpg','frame_105.jpg',
  'frame_106.jpg','frame_109.jpg','frame_114.jpg','frame_121.jpg',
  'frame_127.jpg','frame_133.jpg','frame_141.jpg','frame_148.jpg',
  'frame_157.jpg','frame_158.jpg','frame_159.jpg','frame_165.jpg',
  'frame_169.jpg','frame_173.jpg','frame_174.jpg','frame_175.jpg',
  'frame_176.jpg','frame_178.jpg','frame_180.jpg','frame_182.jpg',
  'frame_186.jpg','frame_192.jpg','frame_202.jpg','frame_203.jpg',
  'frame_209.jpg','frame_210.jpg','frame_211.jpg','frame_213.jpg',
  'frame_215.jpg','frame_221.jpg','frame_223.jpg','frame_224.jpg',
  'frame_225.jpg','frame_227.jpg','frame_229.jpg','frame_230.jpg',
  'frame_232.jpg','frame_234.jpg','frame_235.jpg','frame_236.jpg',
  'frame_237.jpg','frame_238.jpg','frame_239.jpg','frame_240.jpg',
  'frame_245.jpg','frame_248.jpg','frame_249.jpg','frame_251.jpg',
  'frame_252.jpg','frame_256.jpg','frame_257.jpg','frame_258.jpg',
  'frame_259.jpg','frame_260.jpg','frame_261.jpg','frame_263.jpg',
  'frame_264.jpg','frame_266.jpg','frame_268.jpg','frame_270.jpg',
  'frame_273.jpg','frame_275.jpg','frame_277.jpg','frame_279.jpg',
  'frame_283.jpg','frame_286.jpg','frame_290.jpg','frame_296.jpg',
  'frame_300.jpg','frame_306.jpg','frame_308.jpg','frame_309.jpg',
  'frame_310.jpg','frame_311.jpg','frame_313.jpg','frame_317.jpg',
  'frame_323.jpg','frame_325.jpg','frame_326.jpg','frame_327.jpg',
  'frame_329.jpg','frame_330.jpg','frame_333.jpg','frame_334.jpg',
  'frame_335.jpg','frame_336.jpg','frame_338.jpg','frame_339.jpg',
  'frame_340.jpg','frame_341.jpg','frame_342.jpg','frame_343.jpg',
  'frame_344.jpg','frame_346.jpg','frame_347.jpg','frame_349.jpg',
  'frame_350.jpg','frame_351.jpg','frame_353.jpg','frame_355.jpg',
  'frame_356.jpg','frame_357.jpg','frame_359.jpg','frame_361.jpg',
  'frame_363.jpg','frame_364.jpg','frame_365.jpg','frame_366.jpg',
  'frame_367.jpg','frame_368.jpg','frame_369.jpg','frame_370.jpg',
  'frame_371.jpg','frame_372.jpg','frame_374.jpg','frame_375.jpg',
  'frame_376.jpg','frame_377.jpg','frame_378.jpg','frame_380.jpg',
  'frame_382.jpg','frame_383.jpg','frame_384.jpg','frame_385.jpg',
  'frame_386.jpg','frame_388.jpg','frame_389.jpg','frame_390.jpg',
  'frame_391.jpg','frame_392.jpg','frame_393.jpg','frame_394.jpg',
  'frame_395.jpg','frame_396.jpg','frame_397.jpg','frame_398.jpg',
  'frame_399.jpg','frame_400.jpg','frame_401.jpg','frame_402.jpg',
  'frame_403.jpg','frame_404.jpg','frame_405.jpg','frame_406.jpg',
  'frame_407.jpg','frame_409.jpg','frame_411.jpg','frame_412.jpg',
  'frame_414.jpg','frame_415.jpg','frame_416.jpg','frame_417.jpg',
  'frame_418.jpg','frame_419.jpg','frame_420.jpg','frame_421.jpg',
  'frame_422.jpg','frame_423.jpg','frame_424.jpg','frame_425.jpg',
  'frame_428.jpg','frame_429.jpg','frame_430.jpg','frame_431.jpg',
  'frame_432.jpg','frame_433.jpg','frame_434.jpg','frame_436.jpg',
  'frame_437.jpg','frame_438.jpg','frame_439.jpg','frame_440.jpg',
  'frame_441.jpg','frame_442.jpg','frame_443.jpg','frame_444.jpg',
  'frame_445.jpg','frame_446.jpg','frame_447.jpg','frame_448.jpg',
  'frame_449.jpg','frame_451.jpg','frame_452.jpg','frame_453.jpg',
  'frame_455.jpg','frame_456.jpg','frame_457.jpg','frame_458.jpg',
  'frame_459.jpg','frame_461.jpg','frame_462.jpg','frame_463.jpg',
  'frame_464.jpg','frame_465.jpg','frame_466.jpg','frame_467.jpg',
  'frame_468.jpg','frame_469.jpg','frame_470.jpg','frame_471.jpg',
  'frame_472.jpg','frame_474.jpg','frame_476.jpg','frame_477.jpg',
  'frame_478.jpg','frame_480.jpg','frame_481.jpg'
];
const TOTAL_FRAMES    = FRAME_FILES.length; // 259
const HERO_SCROLL_VH  = 500;
const CONCURRENT_LOAD = 8;

function frameSrc(i) {
  return '/frames/' + FRAME_FILES[Math.max(0, Math.min(i, TOTAL_FRAMES - 1))];
}

const STADIUM_OFFSETS = {
  '1': '-06:00', '2': '-06:00', '3': '-06:00', // CST (Mexico City, Guadalajara, Monterrey)
  '4': '-05:00', '5': '-05:00', '6': '-05:00', // CDT (Dallas, Houston, Kansas City)
  '7': '-04:00', '8': '-04:00', '9': '-04:00', '10': '-04:00', '11': '-04:00', '12': '-04:00', // EDT (Atlanta, Miami, Boston, Philadelphia, New York, Toronto)
  '13': '-07:00', '14': '-07:00', '15': '-07:00', '16': '-07:00' // PDT (Vancouver, Seattle, San Francisco, Los Angeles)
};

/* ============================================================
   MATCH DATA
   date  = IST date (North American games shift +1 day to IST)
   timeIST = kick-off in IST (24h)
   ============================================================ */
let matches = [];

function renderFlag(flag) {
  if (!flag) return '<span class="flag" aria-hidden="true">⚽</span>';
  if (flag.startsWith('http')) return `<img src="${flag}" class="flag-img" alt="" onerror="this.style.display='none'">`;
  return `<span class="flag" aria-hidden="true">${flag}</span>`;
}

async function fetchWorldCupData() {
  try {
    const [gRes, sRes, tRes, fdRes] = await Promise.all([
      fetch('/get/games'),
      fetch('/get/stadiums'),
      fetch('/get/teams'),
      fetch('/fd/competitions/2000/matches')
    ]);
    
    const gamesData = await gRes.json();
    const stadiumsData = await sRes.json();
    const teamsData = await tRes.json();
    const fdData = await fdRes.json();
    
    const fdMatches = fdData.matches || [];
    
    // Generate Standings and Bracket from football-data.org matches
    if (typeof calculateStandings === 'function') {
      const groups = calculateStandings(fdMatches);
      renderStandings(groups);
      generateBracket(fdMatches);
    }
    
    const teamMap = {};
    if (teamsData.teams) {
      teamsData.teams.forEach(t => teamMap[t.id] = t);
      
      // Populate Chat Server Select
      const serverSelect = document.getElementById('chat-server-select');
      const favTeamSelect = document.getElementById('chat-fav-team-select');
      
      const sortedTeams = [...teamsData.teams].sort((a, b) => a.name_en.localeCompare(b.name_en));
      
      if (serverSelect) {
        serverSelect.innerHTML = '<option value="ALL" style="color: black;">🌍 Global (ALL)</option>';
        sortedTeams.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.name_en;
          opt.textContent = t.name_en;
          opt.style.color = 'black';
          serverSelect.appendChild(opt);
        });
      }
      
      if (favTeamSelect) {
        favTeamSelect.innerHTML = '<option value="NONE" style="color: black;">🏳️ No Flag</option>';
        sortedTeams.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.name_en;
          opt.textContent = t.name_en;
          opt.style.color = 'black';
          opt.dataset.flag = t.flag;
          favTeamSelect.appendChild(opt);
        });
      }
    }
    
    const stadiumMap = {};
    if (stadiumsData.stadiums) stadiumsData.stadiums.forEach(s => stadiumMap[s.id] = s);
    
    const stageMap = {
      'group': 'Group Stage',
      'r32': 'Round of 32',
      'r16': 'Round of 16',
      'qf': 'Quarter-Final',
      'sf': 'Semi-Final',
      'third': '3rd Place',
      'final': 'Final 🏆'
    };
    
    matches = (gamesData.games || []).map(g => {
      const t1 = teamMap[g.home_team_id];
      const t2 = teamMap[g.away_team_id];
      const s = stadiumMap[g.stadium_id];
      
      const teamAName = t1 ? t1.name_en : (g.home_team_name_en || g.home_team_label || 'TBD');
      const teamAFlag = t1 ? t1.flag : '';
      const teamBName = t2 ? t2.name_en : (g.away_team_name_en || g.away_team_label || 'TBD');
      const teamBFlag = t2 ? t2.flag : '';
      
      const [mdy, hm] = (g.local_date || '').split(' ');
      let dateStr = '2026-06-11';
      let timeIST = '13:00';
      let timestamp = 1781290800000;
      if (mdy && hm) {
        const parts = mdy.split('/');
        if (parts.length === 3) {
          const year = parts[2];
          const month = parts[0].padStart(2, '0');
          const day = parts[1].padStart(2, '0');
          const offset = STADIUM_OFFSETS[g.stadium_id] || '-05:00';
          const isoStr = `${year}-${month}-${day}T${hm}:00${offset}`;
          const dateObj = new Date(isoStr);
          if (!isNaN(dateObj.getTime())) {
            timestamp = dateObj.getTime();
            const istYear = dateObj.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' });
            const istMonth = dateObj.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: '2-digit' });
            const istDay = dateObj.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', day: '2-digit' });
            dateStr = `${istYear}-${istMonth}-${istDay}`;
            timeIST = dateObj.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
          }
        }
      }
      
      const st = g.finished === 'TRUE' ? 'ft' : (g.time_elapsed !== 'notstarted' ? 'live' : 'upcoming');
      
      return {
        id: parseInt(g.id),
        teamA: { name: teamAName, flag: teamAFlag },
        teamB: { name: teamBName, flag: teamBFlag },
        group: g.type === 'group' ? ('Group ' + g.group) : '—',
        stage: stageMap[g.type] || g.type,
        stadium: s ? s.name_en : 'TBD',
        city: s ? s.city_en : 'TBD',
        date: dateStr,
        timeIST: timeIST,
        timestamp: timestamp,
        score: (st !== 'upcoming') ? `${g.home_score} - ${g.away_score}` : null,
        apiStatus: st
      };
    });
  } catch (err) {
    console.error('Failed to fetch API data', err);
  }
}

/* ============================================================
   STATE
   ============================================================ */
let favorites = [];
try {
  favorites = JSON.parse(localStorage.getItem('wcFavs') || '[]');
} catch (e) {
  favorites = [];
}
let filterDate  = 'all';
let filterGroup = 'all';
let filterFavs  = false;
let searchQ     = '';
let frames      = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let curFrame    = 0;
let rafQueued   = false;

/* ── IST helpers ─────────────────────────────────────────── */
function matchIST(m) {
  return new Date(m.timestamp);
}

function matchStatus(m) {
  return m.apiStatus || 'upcoming';
}

function fmtCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const s  = Math.floor(ms / 1000);
  const d  = Math.floor(s / 86400);
  const h  = Math.floor((s % 86400) / 3600);
  const mn = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  if (d > 0) return `${d}d ${z(h)}h ${z(mn)}m`;
  return `${z(h)}:${z(mn)}:${z(sc)}`;
}

function z(n) { return String(n).padStart(2, '0'); }

function fmtDay(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt   = new Date(y, mo - 1, d);
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const mos  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${days[dt.getDay()]} · ${mos[mo-1]} ${d}`;
}

function fmtTab(dateStr) {
  const [, mo, d] = dateStr.split('-').map(Number);
  const mos = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${mos[mo-1]} ${d}`;
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof initViewToggle === 'function') initViewToggle();
  await fetchWorldCupData();
  initNav();
  initHero();
  initNextMatch();
  initSchedule();
  initSearch();
  initNotifications();
  initTheme();
  initFavFilter();
  initModal();
  initTournamentProgress();
  initKeyboardShortcuts();
  initBackToTop();
  initKbdHints();
  startCountdownTick();
  initFanChat();
  initSyncConsole();

  // Hidden admin shortcut: Ctrl+Shift+S to unlock Sync Console
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      const pwd = prompt('Enter Admin Key to unlock Sync Console:');
      if (pwd) {
        window.adminKey = pwd;
        const syncBtn = document.querySelector('[data-view="sync"]');
        if (syncBtn) {
          syncBtn.style.display = 'inline-block';
          syncBtn.click(); // Open it automatically
        }
      }
    }
  });
});

/* ============================================================
   HERO FRAME ANIMATION
   ============================================================ */
const canvas  = document.getElementById('hero-canvas');
const ctx     = canvas ? canvas.getContext('2d', { alpha: false }) : null;

function initHero() {
  if (!canvas || !ctx) return;
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Trigger initial frame and sync scroll state immediately
  drawFrame(0);
  window.addEventListener('scroll', onHeroScroll, { passive: true });
  onHeroScroll(); // Force the text to hide immediately on load
  preloadFrames();
}

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  drawFrame(curFrame);
}

function preloadFrames() {
  const fill   = document.getElementById('loading-bar-fill');
  const overlay= document.getElementById('loading-overlay');
  let   next   = 0;

  function kick() {
    if (next >= TOTAL_FRAMES) return;
    const i = next++;
    const img = new Image();
    img.onload = () => {
      frames[i] = img;
      loadedCount++;
      if (fill) fill.style.width = (loadedCount / TOTAL_FRAMES * 100) + '%';
      if (loadedCount === 1) drawFrame(0);
      if (i === curFrame) drawFrame(curFrame); // Immediately draw if this is the target frame on refresh
      if (loadedCount === 15) showScrollHint();
      if (loadedCount >= TOTAL_FRAMES && overlay) overlay.classList.add('hidden');
      kick();
    };
    img.onerror = () => { loadedCount++; kick(); };
    img.src = frameSrc(i);
  }

  for (let i = 0; i < CONCURRENT_LOAD; i++) kick();
}

function drawFrame(index) {
  if (!ctx) return;
  // find nearest loaded frame
  let fi = index;
  while (fi >= 0 && !frames[fi]) fi--;
  if (fi < 0) { ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height); return; }

  const img = frames[fi];
  const cr  = canvas.width / canvas.height;
  const ir  = img.naturalWidth / img.naturalHeight;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ir > cr) { sw = sh * cr; sx = (img.naturalWidth - sw) / 2; }
  else          { sh = sw / cr; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
}

function onHeroScroll() {
  if (rafQueued) return;
  rafQueued = true;
  requestAnimationFrame(() => {
    rafQueued = false;
    const container = document.getElementById('hero-scroll-container');
    if (!container) return;

    const progress = Math.max(0, Math.min(1,
      window.scrollY / (container.offsetHeight - window.innerHeight)));

    const fi = Math.round(progress * (TOTAL_FRAMES - 1));
    if (fi !== curFrame) { curFrame = fi; drawFrame(fi); }

    // Scroll hint fades out immediately on scroll
    const hint = document.getElementById('scroll-hint');
    if (hint) hint.style.opacity = progress > 0.015 ? '0' : '';

    // Nav
    document.getElementById('main-nav')?.classList.toggle('scrolled', window.scrollY > 60);
  });
}

function showScrollHint() {
  const hint    = document.getElementById('scroll-hint');
  const overlay = document.getElementById('loading-overlay');
  if (hint)    hint.classList.add('show');
  if (overlay) overlay.classList.add('hidden');
}

/* ============================================================
   NEXT MATCH SPOTLIGHT
   ============================================================ */
/* ── IST Prime Time helper (18:00–23:59 IST = great viewing) ── */
function isPrimeTime(m) {
  const [h] = m.timeIST.split(':').map(Number);
  return h >= 18 && h <= 23;
}

function initNextMatch() {
  const now    = Date.now();
  const next   = matches
    .filter(m => matchIST(m).getTime() > now && m.stage === 'Group Stage')
    .sort((a,b) => matchIST(a) - matchIST(b))[0];

  const el = document.getElementById('next-match-card');
  if (!el) return;

  if (!next) { el.innerHTML = '<p class="no-match-text">Tournament has concluded.</p>'; return; }

  el.innerHTML = `
    <div class="nxt-stadium-bg"><img src="stadium.png" alt="" loading="lazy"></div>
    <div class="nxt-team">
      <div class="nxt-flag">${renderFlag(next.teamA.flag)}</div>
      <div class="nxt-name">${next.teamA.name}</div>
    </div>
    <div class="nxt-center">
      <span class="nxt-badge">${next.group}</span>
      <div class="nxt-vs">VS</div>
      <div class="countdown-grid" id="nxt-cd-grid">
        <div class="cd-unit"><div class="cd-num" id="nxt-d">00</div><div class="cd-label">Days</div></div>
        <span class="cd-sep">:</span>
        <div class="cd-unit"><div class="cd-num" id="nxt-h">00</div><div class="cd-label">Hrs</div></div>
        <span class="cd-sep">:</span>
        <div class="cd-unit"><div class="cd-num" id="nxt-m">00</div><div class="cd-label">Min</div></div>
        <span class="cd-sep">:</span>
        <div class="cd-unit"><div class="cd-num" id="nxt-s">00</div><div class="cd-label">Sec</div></div>
      </div>
      <div class="nxt-time">${next.timeIST} IST · ${fmtDay(next.date)}${isPrimeTime(next) ? ' <span class="badge-prime">⭐ Prime Time</span>' : ''}</div>
      <div class="nxt-venue">${next.stadium}<br>${next.city}</div>
    </div>
    <div class="nxt-team">
      <div class="nxt-flag">${renderFlag(next.teamB.flag)}</div>
      <div class="nxt-name">${next.teamB.name}</div>
    </div>`;

  function tick() {
    const diff = matchIST(next) - Date.now();
    if (diff <= 0) return;
    const dd = Math.floor(diff / 86400000);
    const hh = Math.floor((diff % 86400000) / 3600000);
    const mm = Math.floor((diff % 3600000)  / 60000);
    const ss = Math.floor((diff % 60000)    / 1000);
    const get = id => document.getElementById(id);
    get('nxt-d') && (get('nxt-d').textContent = z(dd));
    get('nxt-h') && (get('nxt-h').textContent = z(hh));
    get('nxt-m') && (get('nxt-m').textContent = z(mm));
    get('nxt-s') && (get('nxt-s').textContent = z(ss));
  }
  tick();
  setInterval(tick, 1000);
}

/* ============================================================
   SCHEDULE
   ============================================================ */
function initSchedule() {
  buildDateTabs();
  buildGroupTabs();
  renderSchedule();
}

function uniqueDates() {
  return [...new Set(matches.map(m => m.date))].sort();
}

function buildDateTabs() {
  const c = document.getElementById('date-tabs');
  if (!c) return;

  const allBtn = mkTab('All', 'all', true, 'date-tab');
  allBtn.addEventListener('click', () => setDate('all'));
  c.appendChild(allBtn);

  uniqueDates().forEach(dt => {
    const btn = mkTab(fmtTab(dt), dt, false, 'date-tab');
    btn.addEventListener('click', () => setDate(dt));
    c.appendChild(btn);
  });
}

function buildGroupTabs() {
  const c = document.getElementById('group-tabs');
  if (!c) return;

  const stages = [
    'All',
    'Group A','Group B','Group C','Group D','Group E','Group F',
    'Group G','Group H','Group I','Group J','Group K','Group L',
    'Round of 32','Round of 16','Quarter-Final','Semi-Final','3rd Place','Final 🏆'
  ];

  stages.forEach(s => {
    const key = s === 'All' ? 'all' : s;
    const btn = mkTab(s, key, s === 'All', 'grp-tab');
    btn.addEventListener('click', () => setGroup(key));
    c.appendChild(btn);
  });
}

function mkTab(label, val, active, cls) {
  const btn = document.createElement('button');
  btn.className = cls + (active ? ' active' : '');
  btn.textContent = label;
  btn.dataset.val = val;
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', active ? 'true' : 'false');
  return btn;
}

function setDate(val) {
  filterDate = val;
  document.querySelectorAll('.date-tab').forEach(b => {
    const on = b.dataset.val === val;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on);
  });
  renderSchedule();
}

function setGroup(val) {
  filterGroup = val;
  document.querySelectorAll('.grp-tab').forEach(b => {
    const on = b.dataset.val === val;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on);
  });
  renderSchedule();
}

function filtered() {
  return matches.filter(m => {
    const dOk = filterDate  === 'all' || m.date === filterDate;
    const gOk = filterGroup === 'all' || m.group === filterGroup || m.stage === filterGroup;
    const fOk = !filterFavs || favorites.includes(m.id);
    const sOk = !searchQ   ||
      m.teamA.name.toLowerCase().includes(searchQ) ||
      m.teamB.name.toLowerCase().includes(searchQ) ||
      m.city.toLowerCase().includes(searchQ) ||
      m.stadium.toLowerCase().includes(searchQ);
    return dOk && gOk && fOk && sOk;
  });
}

function renderSchedule() {
  const c = document.getElementById('schedule-cards');
  if (!c) return;
  c.innerHTML = '';

  const list = filtered();

  if (list.length === 0) {
    c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚽</div>No matches found</div>`;
    return;
  }

  // Group by date
  const byDate = {};
  list.forEach(m => { (byDate[m.date] = byDate[m.date] || []).push(m); });

  Object.keys(byDate).sort().forEach((date, di) => {
    const block  = document.createElement('div');
    block.className = 'day-block';

    const hdr   = document.createElement('div');
    hdr.className = 'day-header';
    hdr.innerHTML = `${fmtDay(date)}<span class="day-count">${byDate[date].length} match${byDate[date].length > 1 ? 'es' : ''}</span>`;
    block.appendChild(hdr);

    const grid  = document.createElement('div');
    grid.className = 'cards-grid';

    byDate[date].forEach((m, ci) => {
      const card = buildCard(m);
      card.style.transitionDelay = (ci * 0.04) + 's';
      grid.appendChild(card);
    });

    block.appendChild(grid);
    c.appendChild(block);
  });

  // Scroll reveal
  initReveal();
}

/* ── Match Card ─────────────────────────────────────────── */
function buildCard(m) {
  const status = matchStatus(m);
  const isFav  = favorites.includes(m.id);
  const prime  = isPrimeTime(m) && status === 'upcoming';

  const card   = document.createElement('div');
  card.className = 'match-card' + (isFav ? ' is-fav' : '');
  card.dataset.matchId = m.id;
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${m.teamA.name} vs ${m.teamB.name}, ${m.timeIST} IST`);

  const pillLabel  = m.group === '—' ? m.stage : m.group;
  const statusHTML = buildStatus(m, status);
  const primeBadge = prime ? '<span class="badge-prime">⭐ IST</span>' : '';

  card.innerHTML = `
    <div class="card-head">
      <span class="grp-pill">${pillLabel}</span>
      <div style="display:flex;align-items:center;gap:0.4rem">
        ${primeBadge}
        <button class="fav-btn ${isFav ? 'on' : ''}" data-id="${m.id}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" title="Toggle favorite">
          ${isFav ? '♥' : '♡'}
        </button>
      </div>
    </div>
    <div class="card-teams">
      <div class="c-team">
        <div class="c-flag">${renderFlag(m.teamA.flag)}</div>
        <div class="c-name">${m.teamA.name}</div>
      </div>
      <div class="c-vs">VS</div>
      <div class="c-team">
        <div class="c-flag">${renderFlag(m.teamB.flag)}</div>
        <div class="c-name">${m.teamB.name}</div>
      </div>
    </div>
    <div class="card-foot">
      <div class="card-time-block">
        <div class="card-ist">${m.timeIST} <span style="font-family:var(--font-b);font-size:0.65rem;color:var(--text-3);letter-spacing:0.1em">IST</span></div>
        ${statusHTML}
      </div>
      <div class="card-venue">
        <strong>${m.stadium}</strong><br>${m.city}
      </div>
    </div>
    <span class="card-expand-hint">click to expand</span>`;

  card.querySelector('.fav-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleFav(m.id, card);
  });

  card.addEventListener('click', () => openModal(m));
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(m); } });

  return card;
}

function buildStatus(m, status) {
  if (status === 'live') return `<span class="badge badge-live">LIVE</span>`;
  if (status === 'ft')   return `<span class="badge badge-ft">FT</span>`;
  const diff = matchIST(m) - Date.now();
  return `<span class="badge badge-cd" data-cdid="${m.id}">${fmtCountdown(diff)}</span>`;
}

/* ── Favorites ───────────────────────────────────────────── */
function toggleFav(id, card) {
  const was = favorites.includes(id);
  if (was) {
    favorites = favorites.filter(f => f !== id);
  } else {
    favorites.push(id);
    // heart pop
    const btn = card.querySelector('.fav-btn');
    btn && btn.animate([
      { transform:'scale(1.5)', color:'#e8c46a' },
      { transform:'scale(1)',   color:'#C9A84C' }
    ], { duration: 350, easing:'cubic-bezier(0.34,1.56,0.64,1)' });
    // confetti burst from the card
    const rect = card.getBoundingClientRect();
    spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
  localStorage.setItem('wcFavs', JSON.stringify(favorites));

  const btn = card.querySelector('.fav-btn');
  if (btn) {
    btn.classList.toggle('on', !was);
    btn.textContent = was ? '♡' : '♥';
    btn.setAttribute('aria-label', was ? 'Add to favorites' : 'Remove from favorites');
  }
  card.classList.toggle('is-fav', !was);

  // sync modal fav button if open
  const mfb = document.getElementById('modal-fav-btn');
  if (mfb && Number(mfb.dataset.id) === id) {
    mfb.classList.toggle('on', !was);
    mfb.textContent = (!was ? '♥' : '♡') + ' ' + (!was ? 'Favorited' : 'Add to Favorites');
  }

  if (filterFavs) renderSchedule();
}

function initFavFilter() {
  const btn = document.getElementById('fav-filter-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    filterFavs = !filterFavs;
    btn.classList.toggle('active', filterFavs);
    btn.title = filterFavs ? 'Show all matches' : 'Show favorites';
    renderSchedule();
  });
}

/* ── Countdown tick ─────────────────────────────────────── */
function startCountdownTick() {
  setInterval(() => {
    document.querySelectorAll('[data-cdid]').forEach(el => {
      const id = Number(el.dataset.cdid);
      const m  = matches.find(x => x.id === id);
      if (!m) return;
      const st   = matchStatus(m);
      const diff = matchIST(m) - Date.now();
      if (st === 'live') {
        el.outerHTML = `<span class="badge badge-live">LIVE</span>`;
      } else if (st === 'ft') {
        el.outerHTML = `<span class="badge badge-ft">FT</span>`;
      } else {
        el.textContent = fmtCountdown(diff);
      }
    });
  }, 1000);
}

/* ── Scroll Reveal ───────────────────────────────────────── */
let revealObs;
function initReveal() {
  if (revealObs) revealObs.disconnect();
  const pref = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (pref) {
    document.querySelectorAll('.match-card, .location-page').forEach(c => c.classList.add('revealed'));
    return;
  }
  revealObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('revealed');
        revealObs.unobserve(en.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.match-card:not(.revealed), .location-page:not(.revealed)').forEach(c => revealObs.observe(c));
}

/* ── Search ─────────────────────────────────────────────── */
function initSearch() {
  const inp = document.getElementById('search-input');
  if (!inp) return;
  let timer;
  inp.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      searchQ = inp.value.trim().toLowerCase();
      renderSchedule();
    }, 200);
  });
}

/* ── Toast ───────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
}

function initNotifications() {
  const bellBtn = document.getElementById('bell-btn');
  const modal = document.getElementById('notification-modal');
  const closeBtn = document.getElementById('notif-modal-close');
  const form = document.getElementById('notif-form');
  const input = document.getElementById('notif-email-input');
  const msgEl = document.getElementById('notif-message');

  if (!bellBtn || !modal) return;

  function closeModal() {
    modal.hidden = true;
    msgEl.textContent = '';
    input.value = '';
    msgEl.className = 'notif-msg';
  }

  bellBtn.addEventListener('click', () => {
    modal.hidden = false;
    input.focus();
  });

  closeBtn?.addEventListener('click', closeModal);
  document.getElementById('notif-modal-backdrop')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email.endsWith('@gmail.com')) {
      msgEl.textContent = 'Please enter a valid @gmail.com address.';
      msgEl.className = 'notif-msg error';
      return;
    }

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        msgEl.textContent = '✅ Subscribed successfully!';
        msgEl.className = 'notif-msg success';
        setTimeout(() => {
          closeModal();
          showToast(`✅ Subscribed! Match updates will be sent to ${email}`);
        }, 1500);
      } else {
        msgEl.textContent = data.error || 'Failed to subscribe.';
        msgEl.className = 'notif-msg error';
      }
    } catch (err) {
      msgEl.textContent = 'Network error. Please try again.';
      msgEl.className = 'notif-msg error';
    }
  });
}

/* ── Theme ───────────────────────────────────────────────── */
function initTheme() {
  const btn   = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('wcTheme') || 'dark';
  applyTheme(saved);
  btn?.addEventListener('click', () => {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('wcTheme', next);
  });
}

function applyTheme(t) {
  document.body.className = document.body.className.replace(/\b(dark|light)\b/g, '').trim();
  document.body.classList.add(t);
}

/* ── Nav scroll ─────────────────────────────────────────── */
function initNav() {
  window.addEventListener('scroll', () => {
    document.getElementById('main-nav')?.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

/* ============================================================
   MATCH DETAIL MODAL
   ============================================================ */
let modalCdInterval = null;

function initModal() {
  const modal    = document.getElementById('match-modal');
  const backdrop = document.getElementById('modal-backdrop');
  const closeBtn = document.getElementById('modal-close');
  if (!modal) return;

  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openModal(m) {
  const modal   = document.getElementById('match-modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;

  clearInterval(modalCdInterval);

  const status  = matchStatus(m);
  const isFav   = favorites.includes(m.id);
  const prime   = isPrimeTime(m) && status === 'upcoming';
  const pillLabel = m.group === '—' ? m.stage : m.group;

  // Build countdown block
  let cdHTML = '';
  if (status === 'upcoming') {
    cdHTML = `
      <div class="modal-countdown">
        <div class="modal-cd-label">⏱ Kicks off in</div>
        <div class="modal-cd-value" id="modal-cd-val">${fmtCountdown(matchIST(m) - Date.now())}</div>
      </div>`;
  } else if (status === 'live') {
    cdHTML = `<div class="modal-countdown" style="border-color:rgba(255,59,48,0.35);background:rgba(255,59,48,0.07)">
      <div class="modal-cd-label" style="color:var(--red-live)">🔴 Match in progress</div>
      <div class="modal-cd-value" style="color:var(--red-live)">LIVE</div></div>`;
  } else {
    cdHTML = `<div class="modal-countdown" style="border-color:var(--border)">
      <div class="modal-cd-label">Match ended</div>
      <div class="modal-cd-value" style="font-size:1.2rem;color:var(--text-3)">Full Time</div></div>`;
  }

  content.innerHTML = `
    <div class="modal-hero">
      <img src="stadium.png" alt="Stadium" loading="lazy">
      <div class="modal-hero-overlay"></div>
      <div class="modal-hero-badge">
        <span class="modal-stage-pill" style="margin:0">${pillLabel}</span>
        ${prime ? '<span class="badge-prime">⭐ Prime Time IST</span>' : ''}
        ${status === 'live' ? '<span class="badge badge-live">LIVE</span>' : ''}
        ${status === 'ft'   ? '<span class="badge badge-ft">FT</span>' : ''}
      </div>
    </div>
    <div class="modal-body">
      <div class="modal-matchup">
        <div class="modal-team">
          <div class="modal-flag">${renderFlag(m.teamA.flag)}</div>
          <div class="modal-team-name">${m.teamA.name}</div>
        </div>
        <div class="modal-vs">VS</div>
        <div class="modal-team">
          <div class="modal-flag">${renderFlag(m.teamB.flag)}</div>
          <div class="modal-team-name">${m.teamB.name}</div>
        </div>
      </div>

      ${cdHTML}

      <div class="modal-details">
        <div class="modal-detail-item">
          <div class="modal-detail-label">Kick-off (IST)</div>
          <div class="modal-detail-value">${m.timeIST} IST</div>
        </div>
        <div class="modal-detail-item">
          <div class="modal-detail-label">Date</div>
          <div class="modal-detail-value">${fmtDay(m.date)}</div>
        </div>
        <div class="modal-detail-item">
          <div class="modal-detail-label">Stadium</div>
          <div class="modal-detail-value">${m.stadium}</div>
        </div>
        <div class="modal-detail-item">
          <div class="modal-detail-label">City</div>
          <div class="modal-detail-value">${m.city}</div>
        </div>
        <div class="modal-detail-item">
          <div class="modal-detail-label">Stage</div>
          <div class="modal-detail-value">${m.stage}</div>
        </div>
        <div class="modal-detail-item">
          <div class="modal-detail-label">Match Day</div>
          <div class="modal-detail-value">${m.md > 0 ? 'MD ' + m.md : 'Knockout'}</div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="modal-fav-btn ${isFav ? 'on' : ''}" id="modal-fav-btn" data-id="${m.id}">
          ${isFav ? '♥ Favorited' : '♡ Add to Favorites'}
        </button>
      </div>
    </div>`;

  // Wire fav button inside modal
  const mfb = document.getElementById('modal-fav-btn');
  if (mfb) {
    mfb.addEventListener('click', () => {
      // find matching card in DOM
      const card = document.querySelector(`.match-card[data-match-id="${m.id}"]`);
      if (card) {
        toggleFav(m.id, card);
      } else {
        // card not visible (different filter), update manually
        const was = favorites.includes(m.id);
        if (was) favorites = favorites.filter(f => f !== m.id);
        else { favorites.push(m.id); spawnConfetti(window.innerWidth/2, window.innerHeight/2); }
        localStorage.setItem('wcFavs', JSON.stringify(favorites));
        mfb.classList.toggle('on', !was);
        mfb.textContent = (!was ? '♥' : '♡') + ' ' + (!was ? 'Favorited' : 'Add to Favorites');
        if (filterFavs) renderSchedule();
      }
    });
  }

  // Live countdown in modal
  if (status === 'upcoming') {
    modalCdInterval = setInterval(() => {
      const el = document.getElementById('modal-cd-val');
      if (el) el.textContent = fmtCountdown(matchIST(m) - Date.now());
    }, 1000);
  }

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('modal-close')?.focus();
}

function closeModal() {
  const modal = document.getElementById('match-modal');
  if (!modal) return;
  clearInterval(modalCdInterval);
  modal.hidden = true;
  document.body.style.overflow = '';
}

/* ============================================================
   TOURNAMENT PROGRESS BAR
   ============================================================ */
const STAGE_ORDER = [
  'Group Stage', 'Round of 32', 'Round of 16',
  'Quarter-Final', 'Semi-Final', 'Final 🏆'
];

function initTournamentProgress() {
  const stages = document.querySelectorAll('.tp-stage');
  if (!stages.length) return;

  // Figure out current stage based on date
  const now = Date.now();
  let currentStage = 'Group Stage';
  for (const s of STAGE_ORDER) {
    const stageMatches = matches.filter(m => m.stage === s || (s === 'Group Stage' && m.stage === 'Group Stage'));
    if (!stageMatches.length) continue;
    const latest = Math.max(...stageMatches.map(m => matchIST(m).getTime()));
    if (now >= latest) currentStage = s; else break;
  }

  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  stages.forEach(el => {
    const s = el.dataset.stage;
    const idx = STAGE_ORDER.indexOf(s);
    el.classList.remove('active', 'done');
    if (idx < currentIdx)  el.classList.add('done');
    if (idx === currentIdx) el.classList.add('active');
  });

  // clicking a stage tab filters the schedule
  stages.forEach(el => {
    el.addEventListener('click', () => {
      const s = el.dataset.stage;
      setGroup(s);
      document.getElementById('schedule-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // update active ring
      stages.forEach(x => x.classList.toggle('active', x === el));
    });
  });
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // '/' focuses search (unless already in an input)
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      const inp = document.getElementById('search-input');
      if (inp) { inp.focus(); inp.select(); }
    }
    // 'f' toggles favorites filter
    if (e.key === 'f' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      document.getElementById('fav-filter-btn')?.click();
    }
    // 't' toggles theme
    if (e.key === 't' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      document.getElementById('theme-toggle')?.click();
    }
  });
}

/* ============================================================
   CONFETTI ENGINE
   ============================================================ */
const confCanvas  = document.getElementById('confetti-canvas');
const confCtx     = confCanvas ? confCanvas.getContext('2d') : null;
let   confParticles = [];
let   confRaf = null;

const CONF_COLORS = ['#C9A84C','#e8c46a','#fff','#FFD700','#FF6B6B','#4ECDC4','#A855F7'];

function spawnConfetti(cx, cy) {
  if (!confCanvas || !confCtx) return;
  confCanvas.width  = window.innerWidth;
  confCanvas.height = window.innerHeight;

  const count = 72;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.4;
    const speed = 3 + Math.random() * 7;
    confParticles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      r: 4 + Math.random() * 5,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 10,
      color: CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)],
      alpha: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    });
  }

  if (!confRaf) animateConfetti();
}

function animateConfetti() {
  if (!confCtx) return;
  confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);

  confParticles = confParticles.filter(p => p.alpha > 0.02);

  confParticles.forEach(p => {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.22;   // gravity
    p.vx *= 0.98;   // air resistance
    p.rot += p.rotV;
    p.alpha -= 0.016;

    confCtx.save();
    confCtx.globalAlpha = Math.max(0, p.alpha);
    confCtx.translate(p.x, p.y);
    confCtx.rotate((p.rot * Math.PI) / 180);
    confCtx.fillStyle = p.color;

    if (p.shape === 'rect') {
      confCtx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
    } else {
      confCtx.beginPath();
      confCtx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
      confCtx.fill();
    }
    confCtx.restore();
  });

  if (confParticles.length > 0) {
    confRaf = requestAnimationFrame(animateConfetti);
  } else {
    confRaf = null;
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
  }
}

/* ============================================================
   BACK TO TOP
   ============================================================ */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ============================================================
   KEYBOARD SHORTCUT HINTS BAR
   ============================================================ */
function initKbdHints() {
  const bar = document.getElementById('kbd-hints');
  if (!bar) return;

  // Show hint bar after 5s if user hasn't used keyboard
  let shown    = false;
  let hideTimer;

  const show = () => {
    if (shown) return;
    shown = true;
    bar.classList.add('visible');
    // auto-hide after 8s
    hideTimer = setTimeout(() => bar.classList.remove('visible'), 8000);
  };

  const hide = () => {
    bar.classList.remove('visible');
    clearTimeout(hideTimer);
  };

  setTimeout(show, 5000);

  // Hide once user actually uses a keyboard shortcut
  document.addEventListener('keydown', e => {
    if (e.key === '/' || e.key === 'f' || e.key === 't') hide();
  }, { once: true });

  // Re-show hint bar if user hovers footer (they've scrolled to bottom)
  document.getElementById('main-footer')?.addEventListener('mouseenter', () => {
    if (!shown) { shown = true; bar.classList.add('visible'); }
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => bar.classList.remove('visible'), 6000);
  });
}

/* ============================================================
   WATCH LIVE & FAN CHAT LOGIC
   ============================================================ */
let isSimulatingLive = false; // OFF by default — chat only opens during real match windows
let chatWs = null;
let currentUsername = localStorage.getItem('chatUsername') || '';
let devPasscode = '';

async function verifyHash(input) {
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === 'bcbe65af8559e64705984e4dd7d12090c9d9954148314c6fc9bb663e50782efd'; // SHA-256 for 'Admin2026#AA'
}

if (!currentUsername) {
  currentUsername = 'Fan_' + Math.floor(1000 + Math.random() * 9000);
  localStorage.setItem('chatUsername', currentUsername);
}



function initFanChat() {
  const usernameInput = document.getElementById('chat-username-input');
  const saveBtn = document.getElementById('save-username-btn');
  const msgInput = document.getElementById('chat-msg-input');
  const sendBtn = document.getElementById('send-chat-btn');
  const statusDesc = document.getElementById('chat-match-status-desc');
  const messagesBox = document.getElementById('chat-messages');

  if (usernameInput) {
    usernameInput.value = currentUsername;
  }

  if (saveBtn && usernameInput) {
    saveBtn.addEventListener('click', () => {
      const name = usernameInput.value.trim();
      if (name) {
        currentUsername = name;
        localStorage.setItem('chatUsername', name);
        showToast(`Nickname changed to: ${name}`);
      }
    });
  }

  let isCooldown = false;
  let cooldownSeconds = 5;
  let cooldownInterval = null;

  function startCooldown() {
    isCooldown = true;
    cooldownSeconds = 5;
    if (msgInput) msgInput.disabled = true;
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = `Wait ${cooldownSeconds}s`;
    }
    
    cooldownInterval = setInterval(() => {
      cooldownSeconds--;
      if (cooldownSeconds <= 0) {
        clearInterval(cooldownInterval);
        isCooldown = false;
        
        // Recheck chat status to decide if we should re-enable
        const now = Date.now();
        const activeMatch = matches.find(m => {
          const start = m.timestamp;
          const end = start + (3 * 3600 * 1000); // 2hr match + 1hr grace
          return now >= start && now <= end;
        });
        const isRoomActive = activeMatch || isSimulatingLive;
        
        if (isRoomActive) {
          if (msgInput) msgInput.disabled = false;
          if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send';
          }
          if (msgInput) msgInput.focus();
        } else {
          if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = 'Locked';
          }
        }
      } else {
        if (sendBtn) sendBtn.textContent = `Wait ${cooldownSeconds}s`;
      }
    }, 1000);
  }

  function updateChatStatus() {
    if (isCooldown) return;
    
    const now = Date.now();
    const activeMatch = matches.find(m => {
      const start = m.timestamp;
      // Match ~2hrs + 1hr grace = 3hr total window
      const end = start + (3 * 3600 * 1000);
      return now >= start && now <= end;
    });
    
    const isRoomActive = activeMatch || isSimulatingLive;
    
    if (isRoomActive) {
      const activeMatchObj = activeMatch;
      const matchLabel = activeMatchObj
        ? `${activeMatchObj.teamA.name} vs ${activeMatchObj.teamB.name}`
        : (isSimulatingLive ? '🧪 Simulation Mode' : '');
      statusDesc.innerHTML = `🟢 Chat is <strong style="color:var(--gold-hi)">LIVE</strong>${matchLabel ? '<br><span style="font-size:0.8rem;color:var(--text-2)">' + matchLabel + '</span>' : ''}`;
      if (msgInput) msgInput.disabled = false;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
      }
    } else {
      // Find next upcoming match
      const nextMatch = matches
        .filter(m => m.timestamp > now)
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      
      let nextInfo = '';
      if (nextMatch) {
        const diffMs = nextMatch.timestamp - now;
        const diffH  = Math.floor(diffMs / 3600000);
        const diffM  = Math.floor((diffMs % 3600000) / 60000);
        const diffD  = Math.floor(diffH / 24);
        const timeStr = diffD > 0
          ? `in ${diffD}d ${diffH % 24}h`
          : (diffH > 0 ? `in ${diffH}h ${diffM}m` : `in ${diffM}m`);
        nextInfo = `<br><span style="font-size:0.75rem;color:var(--text-3)">Next: ${nextMatch.teamA.name} vs ${nextMatch.teamB.name} — opens ${timeStr}</span>`;
      }
      
      statusDesc.innerHTML = `<span style="color:var(--red-live)">🔴 Chat is INACTIVE</span>${nextInfo}<br><span style="font-size:0.72rem;color:var(--text-3);margin-top:4px;display:block">Opens at kick-off · closes 1hr after final whistle</span>`;
      if (msgInput) msgInput.disabled = true;
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Locked';
      }
    }
    
    // Sync sim button (hidden from UI, only shown via dev shortcut)
    if (toggleSimBtn) {
      toggleSimBtn.textContent = isSimulatingLive ? '🧪 Disable Simulation' : '🧪 Enable Simulation';
      toggleSimBtn.style.color = isSimulatingLive ? 'var(--red-live)' : 'var(--gold-hi)';
    }
  }

  if (toggleSimBtn) {
    toggleSimBtn.addEventListener('click', () => {
      isSimulatingLive = !isSimulatingLive;
      updateChatStatus();
      showToast(isSimulatingLive ? '🧪 Dev: Simulating Live Match' : '🧪 Dev: Simulation Disabled');
      
      // Notify WS server of simulation status
      if (chatWs && chatWs.readyState === WebSocket.OPEN) {
        chatWs.send(JSON.stringify({
          type: 'toggleSimulation',
          active: isSimulatingLive,
          devPasscode: devPasscode
        }));
      }
    });
  }

  // Dev-only toggle removed

  function connectWs() {
    const wsProto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsHost = window.location.host;
    
    try {
      chatWs = new WebSocket(`${wsProto}${wsHost}`);
      
      chatWs.onopen = () => {
        console.log('Chat WebSocket connected');
        const sel = document.getElementById('chat-server-select');
        chatWs.send(JSON.stringify({ type: 'joinChannel', channel: sel ? sel.value : 'ALL' }));
      };
      
      const serverSelect = document.getElementById('chat-server-select');
      if (serverSelect) {
        serverSelect.addEventListener('change', () => {
          if (chatWs && chatWs.readyState === WebSocket.OPEN) {
            chatWs.send(JSON.stringify({ type: 'joinChannel', channel: serverSelect.value }));
            messagesBox.innerHTML = '<div class="chat-system-msg">Joined ' + (serverSelect.value === 'ALL' ? 'Global Chat' : serverSelect.value + ' Fan Chat') + '</div>';
          }
        });
      }
      
      chatWs.onmessage = (event) => {
        try {
          const msgObj = JSON.parse(event.data);

          // Handle server-pushed match score/status updates from sync job
          if (msgObj && msgObj.type === 'matchesUpdate' && Array.isArray(msgObj.updates)) {
            msgObj.updates.forEach(upd => {
              const m = matches.find(x => x.id === upd.id);
              if (m) {
                m.apiStatus = upd.apiStatus;
                if (upd.score) m.score = upd.score;
              }
              // Live-swap badge on visible match cards
              const badge = document.querySelector(`[data-cdid="${upd.id}"]`);
              if (badge) {
                if (upd.apiStatus === 'live') {
                  badge.outerHTML = `<span class="badge badge-live">LIVE</span>`;
                } else if (upd.apiStatus === 'ft') {
                  badge.outerHTML = `<span class="badge badge-ft">FT</span>`;
                }
              }
            });
            return;
          }

          // Handle bracket progression: re-fetch & re-render bracket + schedule
          if (msgObj && msgObj.type === 'bracketUpdate') {
            console.log(`[WS] Bracket update: ${msgObj.progressedCount} slot(s) resolved. Refreshing...`);
            // Re-fetch the fd/matches route which now has real names from SQLite
            fetch('/fd/competitions/2000/matches')
              .then(r => r.json())
              .then(fdData => {
                const fdMatches = fdData.matches || [];
                // Re-render bracket with real names
                if (typeof generateBracket === 'function') generateBracket(fdMatches);
                // Update in-memory match names for schedule cards
                fdMatches.forEach(fm => {
                  const m = matches.find(x => x.id === fm.id);
                  if (m) {
                    m.teamA.name  = fm.homeTeam?.name || m.teamA.name;
                    m.teamA.flag  = fm.homeTeam?.crest || m.teamA.flag;
                    m.teamB.name  = fm.awayTeam?.name || m.teamB.name;
                    m.teamB.flag  = fm.awayTeam?.crest || m.teamB.flag;
                  }
                });
                renderSchedule();
                showToast(`🏆 Bracket updated — ${msgObj.progressedCount} team(s) advanced!`);
              })
              .catch(e => console.warn('[bracketUpdate] Failed to re-fetch:', e));
            return;
          }

          appendChatMessage(msgObj);
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };
      
      chatWs.onclose = () => {
        console.log('Chat WebSocket closed. Reconnecting in 5s...');
        setTimeout(connectWs, 5000);
      };
      
      chatWs.onerror = (err) => {
        console.error('Chat WebSocket error', err);
      };
    } catch (e) {
      console.error('Failed to create WebSocket', e);
    }
  }

  function appendChatMessage(msg) {
    if (!messagesBox) return;
    
    const isMine = msg.sender === currentUsername;
    const isBot = msg.sender && msg.sender.includes('Callmefifu');
    const isSystem = msg.sender === 'System';
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg${isMine ? ' mine' : ''}${isBot ? ' bot' : ''}${isSystem ? ' system-warning' : ''}`;
    
    let flagHtml = '';
    if (msg.flag) {
      const safeFlag = escapeHtml(msg.flag);
      flagHtml = msg.flag.startsWith('http') ? `<img src="${safeFlag}" class="chat-flag" alt="" style="display: inline-block !important; width: 18px !important; height: 13px !important; margin-left: 6px !important; object-fit: cover !important;" onerror="this.style.display='none'">` : `<span class="chat-flag" style="margin-left: 6px;">${safeFlag}</span>`;
    }

    if (isSystem) {
      msgEl.innerHTML = `<span class="chat-msg-text system-text">${escapeHtml(msg.text)}</span>`;
    } else {
      msgEl.innerHTML = `
        <span class="chat-msg-sender">${escapeHtml(msg.sender)}${flagHtml}</span>
        <span class="chat-msg-text">${escapeHtml(msg.text)}</span>
      `;
    }
    
    messagesBox.appendChild(msgEl);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sendMsg() {
    if (isCooldown) return;
    if (!msgInput || !chatWs || chatWs.readyState !== WebSocket.OPEN) return;
    const text = msgInput.value.trim();
    if (!text) return;
    
    const serverSelect = document.getElementById('chat-server-select');
    const channel = serverSelect ? serverSelect.value : 'ALL';
    
    const favTeamSelect = document.getElementById('chat-fav-team-select');
    let flag = null;
    if (favTeamSelect && favTeamSelect.selectedIndex > 0) {
      flag = favTeamSelect.options[favTeamSelect.selectedIndex].dataset.flag;
    }

    const msgPayload = {
      sender: currentUsername,
      text: text,
      channel: channel,
      flag: flag
    };
    
    chatWs.send(JSON.stringify(msgPayload));
    msgInput.value = '';
    
    startCooldown();
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMsg);
  }
  
  if (msgInput) {
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendMsg();
      }
    });
  }

  connectWs();
  setTimeout(updateChatStatus, 800);
  
  // Periodically check time window status every 10 seconds
  setInterval(updateChatStatus, 10000);
}

/* ============================================================
   SYNC CONSOLE DASHBOARD
   ============================================================ */
function initSyncConsole() {
  const syncNowBtn  = document.getElementById('sync-now-btn');
  const logsBox     = document.getElementById('sync-logs-container');
  const dbSize      = document.getElementById('db-size');
  const dbMatches   = document.getElementById('db-matches-count');
  const dbLogs      = document.getElementById('db-logs-count');
  const intervalVal = document.getElementById('sync-interval-val');

  // API toggle buttons
  const toggleBtns = document.querySelectorAll('.toggle-api-btn');

  // Helper to attach admin key to requests
  async function adminFetch(url) {
    if (!window.adminKey) return { ok: false, status: 401 };
    return fetch(url, { headers: { 'x-admin-key': window.adminKey } });
  }

  async function fetchDbStats() {
    if (!window.adminKey) return;
    try {
      const res = await adminFetch('/api/db-stats');
      if (!res.ok) return;
      const data = await res.json();
      if (dbSize)    dbSize.textContent    = data.fileSize ? (data.fileSize / 1024).toFixed(1) + ' KB' : '0 KB';
      if (dbMatches) dbMatches.textContent = data.matches ?? 0;
      if (dbLogs)    dbLogs.textContent    = data.logs ?? 0;
    } catch (e) {
      console.warn('Could not fetch DB stats:', e);
    }
  }

  async function fetchSyncStatus() {
    if (!window.adminKey) return;
    try {
      const res  = await adminFetch('/api/sync-status');
      if (!res.ok) {
        if (res.status === 401) showToast('❌ Invalid Admin Key!');
        return;
      }
      const data = await res.json();

      // Update interval display
      if (intervalVal) {
        intervalVal.textContent = (data.currentInterval / 1000) + 's';
      }

      // Update outage button states to reflect server truth
      if (data.outages) {
        toggleBtns.forEach(btn => {
          const api = btn.dataset.api;
          if (!api) return;
          const isDisabled = data.outages[api];
          btn.classList.toggle('active-state',  !isDisabled);
          btn.classList.toggle('disabled-state',  isDisabled);
          btn.textContent = isDisabled ? 'Offline 🔴' : 'Online 🟢';
        });
      }

      // Render sync logs
      if (logsBox && Array.isArray(data.logs) && data.logs.length > 0) {
        logsBox.innerHTML = data.logs.map(log => {
          const st   = (log.status || '').toLowerCase();
          const cls  = st === 'success' ? 'log-success'
                     : st === 'partial_success' ? 'log-partial_success'
                     : 'log-failure';

          const ts   = new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          const primaryIcon   = log.primary_status   === 'SUCCESS' ? '✅' : '❌';
          const secondaryIcon = log.secondary_status === 'SUCCESS' ? '✅' : '❌';
          const backupIcon    = log.backup_status    === 'SUCCESS' ? '✅' : '❌';

          return `
            <div class="log-entry ${cls}">
              <span class="log-time">${ts}</span>
              <span class="log-summary">${log.status} · Source: ${log.active_source || 'N/A'}</span>
              <span class="log-details">${primaryIcon} API-Football &nbsp;|&nbsp; ${secondaryIcon} Football-Data &nbsp;|&nbsp; ${backupIcon} Sportmonks</span>
              <span class="log-details" style="color:var(--text-3);font-size:0.65rem">${log.details || ''}</span>
            </div>`;
        }).join('');
      }
    } catch (e) {
      console.warn('Could not fetch sync status:', e);
    }
  }

  // Outage toggle buttons
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const api = btn.dataset.api;
      if (!api) return;
      try {
        btn.disabled = true;
        btn.textContent = '…';
        const res = await adminFetch(`/api/toggle-outage?api=${api}`);
        if (!res.ok) throw new Error('Unauthorized');
        await fetchSyncStatus();   // refresh button states
        showToast(`⚠️ Toggled ${api} outage state`);
      } catch (e) {
        showToast('❌ Could not reach proxy server (or invalid key)');
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Manual sync trigger
  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', async () => {
      syncNowBtn.textContent  = 'Syncing…';
      syncNowBtn.disabled     = true;
      try {
        const res = await adminFetch('/api/sync-now');
        if (!res.ok) throw new Error('Unauthorized');
        showToast('🔄 Sync job triggered successfully!');
        await fetchDbStats();
        await fetchSyncStatus();
      } catch (e) {
        showToast('❌ Could not reach proxy server (or invalid key)');
      } finally {
        syncNowBtn.textContent = 'Sync Now 🔄';
        syncNowBtn.disabled    = false;
      }
    });
  }

  // Initial load + auto-refresh every 30s
  setInterval(() => {
    if (window.adminKey) {
      fetchDbStats();
      fetchSyncStatus();
    }
  }, 30000);
}

/* ============================================================
   WEBSOCKET PATCH — handle live matchesUpdate events
   ============================================================ */
function patchWsForMatchUpdates(origConnectWs) {
  // We monkey-patch the WS onmessage so that matchesUpdate payloads
  // also refresh match card statuses without a full page reload.
  const origOpen = WebSocket.prototype.send;
  return function patchedOnMessage(event) {
    try {
      const obj = JSON.parse(event.data);
      if (obj && obj.type === 'matchesUpdate' && Array.isArray(obj.updates)) {
        obj.updates.forEach(upd => {
          // Update in-memory match status
          const m = matches.find(x => x.id === upd.id);
          if (m) {
            m.apiStatus = upd.apiStatus;
            if (upd.score) m.score = upd.score;
          }
          // Update badge in DOM if card is visible
          const badge = document.querySelector(`[data-cdid="${upd.id}"]`);
          if (badge) {
            if (upd.apiStatus === 'live') {
              badge.outerHTML = `<span class="badge badge-live">LIVE</span>`;
            } else if (upd.apiStatus === 'ft') {
              badge.outerHTML = `<span class="badge badge-ft">FT</span>`;
            }
          }
        });
        return; // don't pass to chat renderer
      }
    } catch (e) { /* not JSON or not matchesUpdate */ }
    // fall through for regular chat messages
  };
}
