/* features.js - Standings & Bracket Logic */

function calculateStandings(fdMatches) {
  const groups = {};
  
  // Initialize Groups A to L
  for (let i = 0; i < 12; i++) {
    const char = String.fromCharCode(65 + i); // A - L
    groups['GROUP_' + char] = {};
  }
  
  const groupMatches = fdMatches.filter(m => m.stage === 'GROUP_STAGE');
  
  groupMatches.forEach(m => {
    if (!m.group) return;
    const g = m.group;
    if (!groups[g]) groups[g] = {};
    
    [m.homeTeam, m.awayTeam].forEach(team => {
      if (!team.id) return;
      if (!groups[g][team.id]) {
        groups[g][team.id] = {
          id: team.id,
          name: team.shortName || team.name,
          crest: team.crest,
          p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0
        };
      }
    });
    
    // Process results if finished
    if (m.status === 'FINISHED' || m.status === 'IN_PLAY') {
      const ht = groups[g][m.homeTeam.id];
      const at = groups[g][m.awayTeam.id];
      
      const hg = m.score.fullTime.home;
      const ag = m.score.fullTime.away;
      
      if (hg !== null && ag !== null) {
        ht.p++; at.p++;
        ht.gf += hg; ht.ga += ag;
        at.gf += ag; at.ga += hg;
        
        if (hg > ag) { ht.w++; ht.pts += 3; at.l++; }
        else if (hg < ag) { at.w++; at.pts += 3; ht.l++; }
        else { ht.d++; at.d++; ht.pts += 1; at.pts += 1; }
      }
    }
  });
  
  // Sort and finalize
  Object.keys(groups).forEach(g => {
    const teams = Object.values(groups[g]);
    teams.forEach(t => t.gd = t.gf - t.ga);
    teams.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    groups[g] = teams;
  });
  
  return groups;
}

function renderStandings(groups) {
  const container = document.getElementById('standings-container');
  if (!container) return;
  
  let html = '';
  Object.keys(groups).sort().forEach(g => {
    const gName = g.replace('_', ' ');
    const teams = groups[g];
    
    html += `
      <div class="standings-group">
        <div class="sg-header">${gName}</div>
        <table class="sg-table">
          <thead>
            <tr>
              <th class="team-col">Team</th>
              <th title="Played">P</th>
              <th title="Won">W</th>
              <th title="Drawn">D</th>
              <th title="Lost">L</th>
              <th title="Goals For">GF</th>
              <th title="Goals Against">GA</th>
              <th title="Goal Difference">GD</th>
              <th title="Points">Pts</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    teams.forEach((t, i) => {
      const qClass = (i < 2) ? 'qualify-row' : ''; // Top 2 qualify
      html += `
        <tr class="${qClass}">
          <td class="team-col">
            ${renderFlag(t.crest)}
            <span>${t.name}</span>
          </td>
          <td>${t.p}</td>
          <td>${t.w}</td>
          <td>${t.d}</td>
          <td>${t.l}</td>
          <td>${t.gf}</td>
          <td>${t.ga}</td>
          <td>${t.gd}</td>
          <td><strong>${t.pts}</strong></td>
        </tr>
      `;
    });
    
    html += `</tbody></table></div>`;
  });
  
  container.innerHTML = html;
}

function generateBracket(fdMatches) {
  const container = document.getElementById('bracket-container');
  if (!container) return;
  
  const stages = [
    { key: 'LAST_32', label: 'Round of 32' },
    { key: 'LAST_16', label: 'Round of 16' },
    { key: 'QUARTER_FINALS', label: 'Quarter-Finals' },
    { key: 'SEMI_FINALS', label: 'Semi-Finals' },
    { key: 'FINAL', label: 'Final' }
  ];
  
  let html = '';
  stages.forEach(stg => {
    const stgMatches = fdMatches.filter(m => m.stage === stg.key);
    html += `<div class="bracket-col"><div class="bracket-round-title">${stg.label}</div>`;
    
    stgMatches.forEach(m => {
      const hName = m.homeTeam?.name || m.homeTeam?.tla || 'TBD';
      const aName = m.awayTeam?.name || m.awayTeam?.tla || 'TBD';
      const hFlag = m.homeTeam?.crest || '';
      const aFlag = m.awayTeam?.crest || '';
      
      const hScore = m.score?.fullTime?.home ?? '-';
      const aScore = m.score?.fullTime?.away ?? '-';
      
      const isFin = m.status === 'FINISHED';
      const hWin = isFin && m.score?.winner === 'HOME_TEAM';
      const aWin = isFin && m.score?.winner === 'AWAY_TEAM';
      
      const d = new Date(m.utcDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      html += `
        <div class="bracket-match">
          <div class="bm-team ${hWin ? 'winner' : isFin && !hWin ? 'loser' : ''}">
            <div class="bm-team-info">${renderFlag(hFlag)} ${hName}</div>
            <div class="bm-score">${hScore}</div>
          </div>
          <div class="bm-team ${aWin ? 'winner' : isFin && !aWin ? 'loser' : ''}">
            <div class="bm-team-info">${renderFlag(aFlag)} ${aName}</div>
            <div class="bm-score">${aScore}</div>
          </div>
          <div class="bm-date">${d}</div>
        </div>
      `;
    });
    
    html += `</div>`;
  });
  
  container.innerHTML = html;
}

function initViewToggle() {
  const btns = document.querySelectorAll('.view-btn');
  const views = {
    matches: document.getElementById('view-matches'),
    standings: document.getElementById('view-standings'),
    bracket: document.getElementById('view-bracket'),
    live: document.getElementById('view-live'),
    chat: document.getElementById('view-chat'),
    sync: document.getElementById('view-sync')
  };
  
  btns.forEach(b => {
    b.addEventListener('click', () => {
      btns.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      
      const targetView = b.getAttribute('data-view');
      Object.keys(views).forEach(k => {
        if (views[k]) {
          views[k].style.display = k === targetView ? 'block' : 'none';
        }
      });
      
      if (targetView === 'chat') {
        const msgBox = document.getElementById('chat-messages');
        if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   PREMIUM FIFA 2026 HOST NATION — Location Experience JS
   ═══════════════════════════════════════════════════════════════ */

(function initLocations() {
  // ── 1. Number counter ──────────────────────────────────────
  function animateCounter(el, target, duration) {
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ── 2. Viewport reveal via IntersectionObserver ────────────
  const locPages = document.querySelectorAll('.location-page');
  const countersDone = new Set();

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const page = entry.target;
      page.classList.add('loc-revealed');

      // Trigger counter for this page
      const counter = page.querySelector('.loc-match-count');
      if (counter && !countersDone.has(counter)) {
        countersDone.add(counter);
        const target = parseInt(counter.dataset.target, 10) || 0;
        // Delay counter start to match stagger
        setTimeout(() => animateCounter(counter, target, 1500), 600);
      }
      // Once revealed, stop observing
      revealObs.unobserve(page);
    });
  }, { threshold: 0.2 });

  locPages.forEach(p => revealObs.observe(p));

  // ── 3. Scroll Zoom + Parallax on image ────────────────────
  function onScroll() {
    locPages.forEach(page => {
      const rect = page.getBoundingClientRect();
      const vh   = window.innerHeight;

      // Is in view?
      if (rect.bottom < 0 || rect.top > vh) return;

      // Scroll progress: 0 (entering bottom) → 1 (leaving top)
      const progress = 1 - (rect.bottom / (vh + rect.height));

      // Scale: 1.00 → 1.05 across the scroll range
      const scale = 1 + progress * 0.05;

      const img = page.querySelector('.loc-img');
      if (img) {
        img.style.transform = `scale(${scale.toFixed(4)})`;
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load

  // ── 4. Mouse Parallax ─────────────────────────────────────
  const MAX_SHIFT = 8; // px

  function onMouseMove(e) {
    // Normalise: -1 to +1 from center of viewport
    const cx = (e.clientX / window.innerWidth  - 0.5) * 2;
    const cy = (e.clientY / window.innerHeight - 0.5) * 2;

    locPages.forEach(page => {
      const rect = page.getBoundingClientRect();
      const vh   = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;

      const scene = page.querySelector('.loc-scene');
      if (scene) {
        const tx = cx * MAX_SHIFT;
        const ty = cy * MAX_SHIFT;
        scene.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
      }
    });
  }

  document.addEventListener('mousemove', onMouseMove, { passive: true });

  // Reset on mouse leave
  document.addEventListener('mouseleave', () => {
    locPages.forEach(page => {
      const scene = page.querySelector('.loc-scene');
      if (scene) scene.style.transform = 'translate(0px, 0px)';
    });
  });

})();
