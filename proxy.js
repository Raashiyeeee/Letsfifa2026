const http = require('http');
const https = require('https');
const { WebSocketServer } = require('ws');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://fifa_user:fifa_password@localhost:5432/fifa_db'
});

// Promise helpers for PostgreSQL
async function runDb(query, params = []) {
  return pool.query(query, params);
}

async function allDb(query, params = []) {
  const res = await pool.query(query, params);
  return res.rows;
}

async function getDb(query, params = []) {
  const res = await pool.query(query, params);
  return res.rows[0];
}

const STADIUM_OFFSETS = {
  '1': '-06:00', '2': '-06:00', '3': '-06:00',
  '4': '-05:00', '5': '-05:00', '6': '-05:00',
  '7': '-04:00', '8': '-04:00', '9': '-04:00', '10': '-04:00', '11': '-04:00', '12': '-04:00',
  '13': '-07:00', '14': '-07:00', '15': '-07:00', '16': '-07:00'
};

// Database Initialization
async function initDb() {
  await runDb(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY,
      stage TEXT,
      group_name TEXT,
      home_team TEXT,
      away_team TEXT,
      home_crest TEXT,
      away_crest TEXT,
      stadium TEXT,
      city TEXT,
      utc_date TEXT,
      status TEXT,
      home_score INTEGER,
      away_score INTEGER,
      elapsed_time INTEGER,
      source_api TEXT,
      confidence_score INTEGER,
      home_team_id INTEGER,
      away_team_id INTEGER,
      stadium_id INTEGER,
      local_date TEXT,
      finished TEXT,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runDb(`
    CREATE TABLE IF NOT EXISTS stadiums (
      id INTEGER PRIMARY KEY,
      name_en TEXT,
      city_en TEXT,
      image TEXT
    )
  `);

  await runDb(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY,
      name_en TEXT,
      flag TEXT,
      group_name TEXT
    )
  `);

  await runDb(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT,
      primary_status TEXT,
      secondary_status TEXT,
      backup_status TEXT,
      active_source TEXT,
      details TEXT
    )
  `);

  await runDb(`
    CREATE TABLE IF NOT EXISTS raw_api_responses (
      api_name TEXT PRIMARY KEY,
      response_json TEXT,
      last_fetched TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runDb(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL
    )
  `);

  console.log('PostgreSQL Database schema initialized.');
}

// Bootstrap Data from worldcup26.ir if DB is empty
async function bootstrapDb() {
  try {
    const matchCount = await getDb('SELECT COUNT(*) as count FROM matches');
    if (matchCount.count > 0) {
      console.log(`Database already contains ${matchCount.count} matches. Skipping bootstrap.`);
      return;
    }

    console.log('Bootstrapping local database from worldcup26.ir...');

    // Fetch stadiums
    const stadiumsData = await new Promise((resolve, reject) => {
      https.get('https://worldcup26.ir/get/stadiums', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });

    if (stadiumsData && stadiumsData.stadiums) {
      for (const s of stadiumsData.stadiums) {
        await runDb(
          'INSERT INTO stadiums (id, name_en, city_en, image) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, city_en = EXCLUDED.city_en, image = EXCLUDED.image',
          [parseInt(s.id), s.name_en, s.city_en, s.image]
        );
      }
      console.log(`Stored ${stadiumsData.stadiums.length} stadiums.`);
    }

    // Fetch teams
    const teamsData = await new Promise((resolve, reject) => {
      https.get('https://worldcup26.ir/get/teams', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });

    const teamMap = {};
    if (teamsData && teamsData.teams) {
      for (const t of teamsData.teams) {
        await runDb(
          'INSERT INTO teams (id, name_en, flag, group_name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, flag = EXCLUDED.flag, group_name = EXCLUDED.group_name',
          [parseInt(t.id), t.name_en, t.flag, t.group]
        );
        teamMap[t.id] = t;
      }
      console.log(`Stored ${teamsData.teams.length} teams.`);
    }

    // Fetch games
    const gamesData = await new Promise((resolve, reject) => {
      https.get('https://worldcup26.ir/get/games', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });

    if (gamesData && gamesData.games) {
      const stadiumMap = {};
      if (stadiumsData && stadiumsData.stadiums) {
        stadiumsData.stadiums.forEach(s => stadiumMap[s.id] = s);
      }

      for (const g of gamesData.games) {
        const t1 = teamMap[g.home_team_id];
        const t2 = teamMap[g.away_team_id];
        const s = stadiumMap[g.stadium_id];

        const homeName = t1 ? t1.name_en : (g.home_team_name_en || g.home_team_label || 'TBD');
        const homeCrest = t1 ? t1.flag : '';
        const awayName = t2 ? t2.name_en : (g.away_team_name_en || g.away_team_label || 'TBD');
        const awayCrest = t2 ? t2.flag : '';

        const stadiumName = s ? s.name_en : 'TBD';
        const cityName = s ? s.city_en : 'TBD';

        const [mdy, hm] = (g.local_date || '').split(' ');
        let utcDateStr = '';
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
              utcDateStr = dateObj.toISOString();
            }
          }
        }
        if (!utcDateStr) {
          utcDateStr = new Date().toISOString();
        }

        const status = g.finished === 'TRUE' ? 'ft' : (g.time_elapsed !== 'notstarted' ? 'live' : 'upcoming');
        const homeScore = status !== 'upcoming' ? parseInt(g.home_score) : null;
        const awayScore = status !== 'upcoming' ? parseInt(g.away_score) : null;

        await runDb(
          `INSERT INTO matches 
          (id, stage, group_name, home_team, away_team, home_crest, away_crest, stadium, city, utc_date, status, home_score, away_score, elapsed_time, source_api, confidence_score, home_team_id, away_team_id, stadium_id, local_date, finished) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          ON CONFLICT (id) DO UPDATE SET
            stage = EXCLUDED.stage, group_name = EXCLUDED.group_name, home_team = EXCLUDED.home_team, away_team = EXCLUDED.away_team,
            home_crest = EXCLUDED.home_crest, away_crest = EXCLUDED.away_crest, stadium = EXCLUDED.stadium, city = EXCLUDED.city,
            utc_date = EXCLUDED.utc_date, status = EXCLUDED.status, home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score,
            elapsed_time = EXCLUDED.elapsed_time, source_api = EXCLUDED.source_api, confidence_score = EXCLUDED.confidence_score,
            home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id, stadium_id = EXCLUDED.stadium_id,
            local_date = EXCLUDED.local_date, finished = EXCLUDED.finished`,
          [
            parseInt(g.id),
            g.type === 'group' ? 'Group Stage' : g.type,
            g.type === 'group' ? ('Group ' + g.group) : '—',
            homeName,
            awayName,
            homeCrest,
            awayCrest,
            stadiumName,
            cityName,
            utcDateStr,
            status,
            homeScore,
            awayScore,
            0,
            'worldcup26.ir (Bootstrap)',
            1,
            g.home_team_id ? parseInt(g.home_team_id) : null,
            g.away_team_id ? parseInt(g.away_team_id) : null,
            g.stadium_id ? parseInt(g.stadium_id) : null,
            g.local_date,
            g.finished
          ]
        );
      }
      console.log(`Successfully bootstrapped ${gamesData.games.length} matches in PostgreSQL database.`);
    }
  } catch (err) {
    console.error('Failed to bootstrap database. Running with empty/existing structures.', err);
  }
}

// -------------------------------------------------------------
// API OUTAGE & KEY DEFINITIONS
// -------------------------------------------------------------
const simulatedOutages = {
  'api-football': false,
  'football-data': false,
  'sportmonks': false
};

const API_KEYS = {
  'api-football': process.env.API_FOOTBALL_KEY || null,
  'football-data': process.env.FOOTBALL_DATA_KEY || null,
  'sportmonks': process.env.SPORTMONKS_KEY || null
};

// -------------------------------------------------------------
// LIVE MATCH SIMULATION STATE
// -------------------------------------------------------------
let simulationInterval = null;
let simStep = 0;

function getSimulatedMatchState() {
  if (!simulationInterval) return null;
  switch (simStep) {
    case 1: return { status: 'live', home_score: 0, away_score: 0, elapsed: 5 };
    case 2: return { status: 'live', home_score: 1, away_score: 0, elapsed: 24 };
    case 3: return { status: 'live', home_score: 1, away_score: 0, elapsed: 40 };
    case 4: return { status: 'live', home_score: 1, away_score: 0, elapsed: 55 };
    case 5: return { status: 'live', home_score: 1, away_score: 1, elapsed: 58 };
    case 6: return { status: 'suspended', home_score: 1, away_score: 1, elapsed: 60 };
    case 7: return { status: 'live', home_score: 1, away_score: 1, elapsed: 65 };
    case 8: return { status: 'ft', home_score: 1, away_score: 1, elapsed: 90 };
    default: return null;
  }
}

// -------------------------------------------------------------
// MOCK DATA GENERATOR (Matches schemas of official APIs)
// -------------------------------------------------------------
async function getMockData(apiName) {
  const dbMatches = await allDb('SELECT * FROM matches');
  const simMatch = getSimulatedMatchState();

  const formatted = dbMatches.map(m => {
    let status = m.status;
    let homeScore = m.home_score;
    let awayScore = m.away_score;
    let elapsed = m.elapsed_time || 0;

    // Overlay active simulation on Mexico (ID: 1) vs South Africa (ID: 2)
    if (m.id === 1 && simMatch) {
      status = simMatch.status;
      homeScore = simMatch.home_score;
      awayScore = simMatch.away_score;
      elapsed = simMatch.elapsed;
    }
    return { ...m, status, home_score: homeScore, away_score: awayScore, elapsed_time: elapsed };
  });

  if (apiName === 'api-football') {
    return {
      response: formatted.map(m => ({
        fixture: {
          id: m.id,
          date: m.utc_date,
          status: {
            long: m.status === 'live' ? 'In Play' : (m.status === 'ft' ? 'Match Finished' : (m.status === 'suspended' ? 'Match Suspended' : 'Not Started')),
            short: m.status === 'live' ? '1H' : (m.status === 'ft' ? 'FT' : (m.status === 'suspended' ? 'SUSP' : 'NS')),
            elapsed: m.elapsed_time
          }
        },
        teams: {
          home: { name: m.home_team, logo: m.home_crest },
          away: { name: m.away_team, logo: m.away_crest }
        },
        goals: {
          home: m.home_score,
          away: m.away_score
        }
      }))
    };
  } else if (apiName === 'football-data') {
    return {
      matches: formatted.map(m => ({
        id: m.id,
        utcDate: m.utc_date,
        status: m.status === 'live' ? 'IN_PLAY' : (m.status === 'ft' ? 'FINISHED' : (m.status === 'suspended' ? 'SUSPENDED' : 'TIMED')),
        stage: m.stage === 'Group Stage' ? 'GROUP_STAGE' : m.stage.toUpperCase().replace(' ', '_'),
        group: m.group_name === '—' ? null : m.group_name.toUpperCase().replace(' ', '_'),
        homeTeam: { id: m.home_team_id || (m.id * 2), name: m.home_team, crest: m.home_crest },
        awayTeam: { id: m.away_team_id || (m.id * 2 + 1), name: m.away_team, crest: m.away_crest },
        score: {
          winner: m.status === 'ft' ? (m.home_score > m.away_score ? 'HOME_TEAM' : (m.home_score < m.away_score ? 'AWAY_TEAM' : 'DRAW')) : null,
          duration: 'REGULAR',
          fullTime: { home: m.home_score, away: m.away_score }
        }
      }))
    };
  } else if (apiName === 'sportmonks') {
    return {
      data: formatted.map(m => ({
        id: m.id,
        name: `${m.home_team} vs ${m.away_team}`,
        starting_at: m.utc_date,
        starting_at_timestamp: Math.floor(new Date(m.utc_date).getTime() / 1000),
        result_info: null,
        state_id: m.status === 'live' ? 3 : (m.status === 'ft' ? 5 : (m.status === 'suspended' ? 8 : 1)), // 3=Inplay, 5=Ended, 8=Suspended, 1=Scheduled
        participants: [
          { id: m.home_team_id || (m.id * 2), name: m.home_team, meta: { location: 'home' }, image_path: m.home_crest },
          { id: m.away_team_id || (m.id * 2 + 1), name: m.away_team, meta: { location: 'away' }, image_path: m.away_crest }
        ],
        scores: [
          { score: { goals: m.home_score }, description: 'CURRENT', participant_id: m.home_team_id || (m.id * 2) },
          { score: { goals: m.away_score }, description: 'CURRENT', participant_id: m.away_team_id || (m.id * 2 + 1) }
        ]
      }))
    };
  }
}

// -------------------------------------------------------------
// API FETCHERS (HTTP + Outage and fallback detection)
// -------------------------------------------------------------
async function fetchFromApiFootball() {
  if (simulatedOutages['api-football']) {
    throw new Error('Simulated API-Football Outage');
  }
  const key = API_KEYS['api-football'];
  if (!key) {
    return await getMockData('api-football');
  }
  return new Promise((resolve, reject) => {
    const options = { headers: { 'x-apisports-key': key } };
    https.get('https://v3.football.api-sports.io/fixtures?league=1&season=2026', options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchFromFootballData() {
  if (simulatedOutages['football-data']) {
    throw new Error('Simulated Football-Data.org Outage');
  }
  const key = API_KEYS['football-data'];
  if (!key) {
    return await getMockData('football-data');
  }
  return new Promise((resolve, reject) => {
    const options = { headers: { 'X-Auth-Token': key } };
    https.get('https://api.football-data.org/v4/competitions/2000/matches', options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchFromSportmonks() {
  if (simulatedOutages['sportmonks']) {
    throw new Error('Simulated Sportmonks Outage');
  }
  const key = API_KEYS['sportmonks'];
  if (!key) {
    return await getMockData('sportmonks');
  }
  return new Promise((resolve, reject) => {
    https.get(`https://api.sportmonks.com/v3/football/fixtures?api_token=${key}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// -------------------------------------------------------------
// NORMALIZATION & FIXTURE MAPPING
// -------------------------------------------------------------
function normalizeTeamName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('fc', '')
    .replace('united', '')
    .replace('city', '')
    .replace('club', '')
    .trim();
}

function findMatchingFixture(targetMatch, candidates, apiType) {
  const targetHome = normalizeTeamName(targetMatch.home_team);
  const targetAway = normalizeTeamName(targetMatch.away_team);
  const targetDate = new Date(targetMatch.utc_date);

  return candidates.find(c => {
    let candidateHome = '';
    let candidateAway = '';
    let candidateDate = null;

    if (apiType === 'api-football') {
      candidateHome = normalizeTeamName(c.teams?.home?.name);
      candidateAway = normalizeTeamName(c.teams?.away?.name);
      candidateDate = new Date(c.fixture?.date);
    } else if (apiType === 'football-data') {
      candidateHome = normalizeTeamName(c.homeTeam?.name);
      candidateAway = normalizeTeamName(c.awayTeam?.name);
      candidateDate = new Date(c.utcDate);
    } else if (apiType === 'sportmonks') {
      const homePart = c.participants?.find(p => p.meta?.location === 'home');
      const awayPart = c.participants?.find(p => p.meta?.location === 'away');
      candidateHome = normalizeTeamName(homePart?.name);
      candidateAway = normalizeTeamName(awayPart?.name);
      candidateDate = c.starting_at_timestamp ? new Date(c.starting_at_timestamp * 1000) : new Date(c.starting_at);
    }

    if (!candidateHome || !candidateAway || isNaN(candidateDate.getTime())) return false;

    const homeMatch = candidateHome === targetHome || candidateHome.includes(targetHome) || targetHome.includes(candidateHome);
    const awayMatch = candidateAway === targetAway || candidateAway.includes(targetAway) || targetAway.includes(candidateAway);

    const timeDiff = Math.abs(candidateDate.getTime() - targetDate.getTime());
    const dateMatch = timeDiff < 18 * 3600 * 1000;

    return homeMatch && awayMatch && dateMatch;
  });
}

// -------------------------------------------------------------
// CORE SYNCHRONIZATION JOB & CONFIDENCE TIER RANKING
// -------------------------------------------------------------
let isSyncing = false;
let lastSyncTime = 0;

async function runSyncJob() {
  if (isSyncing) return;
  isSyncing = true;
  const start = Date.now();

  let primaryStatus = 'PENDING';
  let secondaryStatus = 'PENDING';
  let backupStatus = 'PENDING';

  let rawApiFootball = null;
  let rawFootballData = null;
  let rawSportmonks = null;

  // 1. Poll Primary
  try {
    rawApiFootball = await fetchFromApiFootball();
    primaryStatus = 'SUCCESS';
    await runDb(
      'INSERT INTO raw_api_responses (api_name, response_json, last_fetched) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (api_name) DO UPDATE SET response_json = EXCLUDED.response_json, last_fetched = CURRENT_TIMESTAMP',
      ['api-football', JSON.stringify(rawApiFootball)]
    );
  } catch (err) {
    primaryStatus = 'FAILED: ' + err.message;
  }

  // 2. Poll Secondary
  try {
    rawFootballData = await fetchFromFootballData();
    secondaryStatus = 'SUCCESS';
    await runDb(
      'INSERT INTO raw_api_responses (api_name, response_json, last_fetched) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (api_name) DO UPDATE SET response_json = EXCLUDED.response_json, last_fetched = CURRENT_TIMESTAMP',
      ['football-data', JSON.stringify(rawFootballData)]
    );
  } catch (err) {
    secondaryStatus = 'FAILED: ' + err.message;
  }

  // 3. Poll Backup
  try {
    rawSportmonks = await fetchFromSportmonks();
    backupStatus = 'SUCCESS';
    await runDb(
      'INSERT INTO raw_api_responses (api_name, response_json, last_fetched) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (api_name) DO UPDATE SET response_json = EXCLUDED.response_json, last_fetched = CURRENT_TIMESTAMP',
      ['sportmonks', JSON.stringify(rawSportmonks)]
    );
  } catch (err) {
    backupStatus = 'FAILED: ' + err.message;
  }

  const dbMatches = await allDb('SELECT * FROM matches');
  let activeSource = 'None';
  let updatedCount = 0;
  const updatesToBroadcast = [];

  for (const m of dbMatches) {
    let candidatePrimary = null;
    let candidateSecondary = null;
    let candidateBackup = null;

    if (rawApiFootball && rawApiFootball.response) {
      candidatePrimary = findMatchingFixture(m, rawApiFootball.response, 'api-football');
    }
    if (rawFootballData && rawFootballData.matches) {
      candidateSecondary = findMatchingFixture(m, rawFootballData.matches, 'football-data');
    }
    if (rawSportmonks && rawSportmonks.data) {
      candidateBackup = findMatchingFixture(m, rawSportmonks.data, 'sportmonks');
    }

    // Majority Voting System
    let states = [];

    if (candidatePrimary) {
      const sh = candidatePrimary.fixture?.status?.short;
      states.push({
        source: 'API-Football',
        home: candidatePrimary.goals?.home ?? null,
        away: candidatePrimary.goals?.away ?? null,
        status: sh === 'FT' || sh === 'AET' || sh === 'PEN' ? 'ft' : (sh === 'NS' || sh === 'TBD' ? 'upcoming' : (sh === 'SUSP' ? 'suspended' : 'live')),
        elapsed: candidatePrimary.fixture?.status?.elapsed || 0,
        weight: 3
      });
    }

    if (candidateSecondary) {
      const st = candidateSecondary.status;
      states.push({
        source: 'Football-Data.org',
        home: candidateSecondary.score?.fullTime?.home ?? null,
        away: candidateSecondary.score?.fullTime?.away ?? null,
        status: st === 'FINISHED' ? 'ft' : (st === 'TIMED' || st === 'SCHEDULED' ? 'upcoming' : (st === 'SUSPENDED' ? 'suspended' : 'live')),
        elapsed: m.elapsed_time || 0,
        weight: 2
      });
    }

    if (candidateBackup) {
      const homePart = candidateBackup.participants?.find(p => p.meta?.location === 'home');
      const awayPart = candidateBackup.participants?.find(p => p.meta?.location === 'away');
      const homeScoreObj = candidateBackup.scores?.find(s => s.participant_id === homePart?.id);
      const awayScoreObj = candidateBackup.scores?.find(s => s.participant_id === awayPart?.id);
      const sid = candidateBackup.state_id;
      states.push({
        source: 'Sportmonks',
        home: homeScoreObj ? homeScoreObj.score?.goals : null,
        away: awayScoreObj ? awayScoreObj.score?.goals : null,
        status: sid === 5 ? 'ft' : (sid === 1 ? 'upcoming' : (sid === 8 ? 'suspended' : 'live')),
        elapsed: m.elapsed_time || 0,
        weight: 1
      });
    }

    let selectedScore = { home: m.home_score, away: m.away_score };
    let selectedStatus = m.status;
    let selectedElapsed = m.elapsed_time || 0;
    let sourceUsed = m.source_api;
    let confidence = m.confidence_score;

    if (states.length > 0) {
      // Group by signature: "home-away-status"
      let tally = {};
      for (const s of states) {
        const sig = `${s.home}-${s.away}-${s.status}`;
        if (!tally[sig]) {
          tally[sig] = { count: 0, state: s, sources: [] };
        }
        tally[sig].count++;
        tally[sig].sources.push(s.source);
      }
      
      // Find the signature with the most votes
      // Tie-breaker: highest weighted source in the group
      let bestSig = null;
      let maxCount = 0;
      let bestWeight = -1;
      
      for (const sig in tally) {
        const group = tally[sig];
        const maxGroupWeight = Math.max(...group.sources.map(src => 
          src === 'API-Football' ? 3 : src === 'Football-Data.org' ? 2 : 1
        ));
        
        if (group.count > maxCount || (group.count === maxCount && maxGroupWeight > bestWeight)) {
          maxCount = group.count;
          bestWeight = maxGroupWeight;
          bestSig = sig;
        }
      }
      
      const winningState = tally[bestSig].state;
      const winningSources = tally[bestSig].sources.join(' + ');

      selectedScore.home = winningState.home;
      selectedScore.away = winningState.away;
      selectedStatus = winningState.status;
      selectedElapsed = winningState.elapsed;
      
      if (maxCount >= 2) {
        sourceUsed = `Majority (${winningSources})`;
        confidence = 3; // High confidence from agreement
      } else {
        sourceUsed = winningState.source;
        confidence = winningState.weight;
      }
    }

    if (sourceUsed !== m.source_api) {
      activeSource = sourceUsed;
    }

    const scoreChanged = m.home_score !== selectedScore.home || m.away_score !== selectedScore.away;
    const statusChanged = m.status !== selectedStatus;

    if (scoreChanged || statusChanged) {
      updatedCount++;
      await runDb(
        `UPDATE matches SET
          status            = $1,
          home_score        = $2,
          away_score        = $3,
          elapsed_time      = $4,
          source_api        = $5,
          confidence_score  = $6,
          last_updated      = CURRENT_TIMESTAMP
        WHERE id = $7`,
        [
          selectedStatus,
          selectedScore.home,
          selectedScore.away,
          selectedElapsed,
          sourceUsed,
          confidence,
          m.id
        ]
      );

      // Trigger bot alerts/messages for the front-end chat room
      const oldState = { status: m.status, scoreHome: m.home_score, scoreAway: m.away_score };
      const newState = { status: selectedStatus, scoreHome: selectedScore.home, scoreAway: selectedScore.away };
      processMatchAlerts(m.id, m.home_team, m.away_team, oldState, newState);

      updatesToBroadcast.push({
        id: m.id,
        status: selectedStatus,
        score: selectedScore.home !== null ? `${selectedScore.home} - ${selectedScore.away}` : null,
        apiStatus: selectedStatus,
        source_api: sourceUsed,
        confidence_score: confidence
      });
    }
  }

  if (updatesToBroadcast.length > 0) {
    broadcastWs({
      type: 'matchesUpdate',
      updates: updatesToBroadcast
    });
  }

  const duration = Date.now() - start;
  const statusSummary = (primaryStatus === 'SUCCESS' && secondaryStatus === 'SUCCESS' && backupStatus === 'SUCCESS') 
    ? 'SUCCESS' 
    : (primaryStatus === 'SUCCESS' || secondaryStatus === 'SUCCESS' || backupStatus === 'SUCCESS') 
      ? 'PARTIAL_SUCCESS' 
      : 'FAILED';

  await runDb(
    `INSERT INTO sync_logs (status, primary_status, secondary_status, backup_status, active_source, details) 
    VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      statusSummary,
      primaryStatus,
      secondaryStatus,
      backupStatus,
      activeSource === 'None' ? (rawApiFootball ? 'API-Football' : (rawFootballData ? 'Football-Data.org' : (rawSportmonks ? 'Sportmonks' : 'None'))) : activeSource,
      `Polled in ${duration}ms. Merged ${updatedCount} updates.`
    ]
  );

  lastSyncTime = Date.now();
  isSyncing = false;
  console.log(`[SYNC] Completed in ${duration}ms. Status: ${statusSummary}. Updated ${updatedCount} matches.`);

  // Run bracket progression after every sync so names bubble up as results arrive
  progressBracket().catch(e => console.error('[BRACKET] Error:', e.message));
}

// ══════════════════════════════════════════════════════════════
// BRACKET PROGRESSION ENGINE
// Runs after every sync. Resolves placeholder names into real
// team names as group-stage & knockout results come in.
// ══════════════════════════════════════════════════════════════
async function computeGroupStandings() {
  const groupMatches = await allDb(`SELECT * FROM matches WHERE stage = 'Group Stage' AND status = 'ft'`);
  const teamRows = await allDb('SELECT * FROM teams');
  const teamByName = {};
  teamRows.forEach(t => { teamByName[t.name_en] = t; });

  const raw = {}; // { 'Group A': { 'Mexico': {...stats} } }
  groupMatches.forEach(m => {
    const grp = m.group_name;
    if (!grp || grp === '—') return;
    if (!raw[grp]) raw[grp] = {};

    const ensure = (name) => {
      if (!raw[grp][name]) {
        const t = teamByName[name] || {};
        raw[grp][name] = { name, crest: t.flag || '', mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
      }
    };
    ensure(m.home_team); ensure(m.away_team);

    const hs = m.home_score || 0, as_ = m.away_score || 0;
    raw[grp][m.home_team].mp++; raw[grp][m.away_team].mp++;
    raw[grp][m.home_team].gf += hs; raw[grp][m.home_team].ga += as_;
    raw[grp][m.away_team].gf += as_; raw[grp][m.away_team].ga += hs;

    if (hs > as_) {
      raw[grp][m.home_team].w++; raw[grp][m.home_team].pts += 3;
      raw[grp][m.away_team].l++;
    } else if (hs < as_) {
      raw[grp][m.away_team].w++; raw[grp][m.away_team].pts += 3;
      raw[grp][m.home_team].l++;
    } else {
      raw[grp][m.home_team].d++; raw[grp][m.home_team].pts++;
      raw[grp][m.away_team].d++; raw[grp][m.away_team].pts++;
    }
  });

  // Sort each group: pts → GD → GF
  const sorted = {};
  for (const grp in raw) {
    sorted[grp] = Object.values(raw[grp]).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const agd = a.gf - a.ga, bgd = b.gf - b.ga;
      if (bgd !== agd) return bgd - agd;
      return b.gf - a.gf;
    });
  }
  return sorted;
}

async function progressBracket() {
  const standings = await computeGroupStandings();

  // Build quick-lookup: e.g. 'Winner Group A' -> {name, crest}
  const slotMap = {};
  const thirdByGroup = {};

  for (const grp in standings) {
    const letter = grp.replace('Group ', ''); // 'A'
    const teams = standings[grp];
    if (teams[0]) slotMap[`Winner Group ${letter}`]   = { name: teams[0].name, crest: teams[0].crest };
    if (teams[1]) slotMap[`Runner-up Group ${letter}`] = { name: teams[1].name, crest: teams[1].crest };
    if (teams[2]) thirdByGroup[letter] = { ...teams[2] };
  }

  // Resolve a "3rd Group A/B/C/D/F" slot → best 3rd-place team from those groups
  const best3rd = (groupLetters) => {
    const candidates = groupLetters
      .filter(l => thirdByGroup[l])
      .map(l => thirdByGroup[l]);
    candidates.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const agd = a.gf - a.ga, bgd = b.gf - b.ga;
      if (bgd !== agd) return bgd - agd;
      return b.gf - a.gf;
    });
    return candidates[0] || null;
  };

  // Build winner/loser map from finished knockout matches
  const knockoutMatches = await allDb(`SELECT * FROM matches WHERE stage != 'Group Stage' ORDER BY id`);
  const matchResult = {}; // matchId -> { winner, loser } each = {name, crest}
  knockoutMatches.filter(m => m.status === 'ft').forEach(m => {
    const homeWon = (m.home_score || 0) > (m.away_score || 0);
    matchResult[m.id] = {
      winner: homeWon ? { name: m.home_team, crest: m.home_crest } : { name: m.away_team, crest: m.away_crest },
      loser:  homeWon ? { name: m.away_team, crest: m.away_crest } : { name: m.home_team, crest: m.home_crest }
    };
  });

  // Resolve any placeholder string -> {name, crest} or null
  const resolve = (placeholder) => {
    if (slotMap[placeholder]) return slotMap[placeholder]; // Winner/Runner-up Group X

    const wm = placeholder.match(/^Winner Match (\d+)$/);
    if (wm) return matchResult[parseInt(wm[1])]?.winner || null;

    const lm = placeholder.match(/^Loser Match (\d+)$/);
    if (lm) return matchResult[parseInt(lm[1])]?.loser || null;

    const tm = placeholder.match(/^3rd Group ([A-L\/]+)$/);
    if (tm) return best3rd(tm[1].split('/'));

    return null; // not yet determinable
  };

  const isPlaceholder = (s) => /^(Winner|Runner-up|Loser|3rd)\b/.test(s || '');

  let progressedCount = 0;
  for (const m of knockoutMatches) {
    let hName = m.home_team, hCrest = m.home_crest;
    let aName = m.away_team, aCrest = m.away_crest;
    let changed = false;

    if (isPlaceholder(hName)) {
      const r = resolve(hName);
      if (r) { hName = r.name; hCrest = r.crest; changed = true; }
    }
    if (isPlaceholder(aName)) {
      const r = resolve(aName);
      if (r) { aName = r.name; aCrest = r.crest; changed = true; }
    }

    if (changed) {
      progressedCount++;
      await runDb(
        `UPDATE matches SET home_team = $1, home_crest = $2, away_team = $3, away_crest = $4 WHERE id = $5`,
        [hName, hCrest, aName, aCrest, m.id]
      );
    }
  }

  if (progressedCount > 0) {
    console.log(`[BRACKET] Progressed ${progressedCount} knockout slot(s) with real team names.`);
    broadcastWs({ type: 'bracketUpdate', progressedCount });
  }
  return progressedCount;
}

function processMatchAlerts(id, homeName, awayName, old, newState) {
  const newH = newState.scoreHome;
  const newA = newState.scoreAway;
  const oldH = old.scoreHome;
  const oldA = old.scoreAway;

  if (old.status !== 'live' && newState.status === 'live') {
    broadcastBotMessage(`🚨 Match kickoff! ${homeName} vs ${awayName} has officially started!`);
  }

  if (newState.status === 'live' && newH !== null && newA !== null) {
    if (oldH !== null && newH > oldH) {
      broadcastBotMessage(`⚽ GOAL! ${homeName} scores! Score: ${homeName} ${newH} - ${newA} ${awayName}`);
    }
    if (oldA !== null && newA > oldA) {
      broadcastBotMessage(`⚽ GOAL! ${awayName} scores! Score: ${homeName} ${newH} - ${newA} ${awayName}`);
    }
  }

  if (old.status !== 'suspended' && newState.status === 'suspended') {
    broadcastBotMessage(`⚠️ Match suspended: ${homeName} vs ${awayName} has been temporarily suspended.`);
  }

  if (old.status !== 'ft' && newState.status === 'ft') {
    broadcastBotMessage(`🏁 Full Time! ${homeName} ${newH} - ${newA} ${awayName}`);
  }
}

// -------------------------------------------------------------
// ADAPTIVE SYNCHRONIZATION JOB SCHEDULER
// -------------------------------------------------------------
let syncIntervalId = null;
let currentSyncInterval = 300000; // 5 minutes default

async function determineSyncInterval() {
  const now = Date.now();
  const dbMatches = await allDb('SELECT * FROM matches');
  
  // A match is active if status is live/suspended or if current time is within [kickoff, kickoff + 3.5h]
  const hasLiveMatch = dbMatches.some(m => {
    if (m.status === 'live' || m.status === 'suspended') return true;
    const matchTime = new Date(m.utc_date).getTime();
    return now >= matchTime && now <= matchTime + (3.5 * 3600 * 1000);
  });

  const targetInterval = hasLiveMatch ? 30000 : 300000; // 30 seconds during matches, 5 minutes otherwise

  if (targetInterval !== currentSyncInterval || !syncIntervalId) {
    currentSyncInterval = targetInterval;
    if (syncIntervalId) clearInterval(syncIntervalId);
    
    console.log(`[SCHEDULER] Setting sync interval to ${currentSyncInterval / 1000} seconds.`);
    syncIntervalId = setInterval(runSyncJob, currentSyncInterval);
  }
}

// -------------------------------------------------------------
// WEBSOCKET CHAT & NOTIFICATIONS
// -------------------------------------------------------------
const FORBIDDEN_WORDS = [
  'fuck', 'shit', 'asshole', 'bitch', 'bastard', 'cunt', 'dick', 'pussy', 'nude', 'sex', 'porn', 'vulgar', 'abuse', 'whore', 'slut',
  'myr', 'myre', 'thayoli', 'kundan', 'amma', 'achan', 'polayadi'
];

const ipViolations = {};
const bannedIps = new Set();
const lastMsgTime = {};

function containsProfanity(text) {
  const cleanText = text.toLowerCase();
  return FORBIDDEN_WORDS.some(word => cleanText.includes(word));
}

function containsLink(text) {
  const safeUrlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|org|net|io|co|us|uk|me|info|tv|xyz)(\/[^\s]*)?)/i;
  return safeUrlRegex.test(text);
}

function broadcastWs(payload, senderWs = null) {
  const dataStr = JSON.stringify(payload);
  const msgChannel = payload.channel || 'ALL';

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      const clientChannel = client.channel || 'ALL';
      // Route message if sent to ALL, if client is listening to ALL, or if channels exactly match
      if (msgChannel === 'ALL' || clientChannel === 'ALL' || msgChannel === clientChannel || !payload.sender) {
        client.send(dataStr);
      }
    }
  });
}

function broadcastBotMessage(text) {
  const msgPayload = {
    sender: 'Callmefifu 🤖',
    text: text
  };
  broadcastWs(msgPayload);
  console.log('Bot message:', text);
}



// -------------------------------------------------------------
// FOOTBALL-DATA.ORG RESPONSE FORMATTER
// -------------------------------------------------------------
function mapMatchesToFootballDataFormat(rows) {
  const stageMap = {
    'Group Stage': 'GROUP_STAGE',
    'r32': 'LAST_32',
    'r16': 'LAST_16',
    'qf': 'QUARTER_FINALS',
    'sf': 'SEMI_FINALS',
    'third': 'THIRD_PLACE',
    'final': 'FINAL'
  };

  const statusMap = {
    'upcoming': 'TIMED',
    'live': 'IN_PLAY',
    'ft': 'FINISHED',
    'suspended': 'SUSPENDED'
  };

  return rows.map(m => {
    const gName = m.group_name === '—' ? null : m.group_name.toUpperCase().replace(' ', '_');
    return {
      id: m.id,
      utcDate: m.utc_date,
      status: statusMap[m.status] || 'TIMED',
      matchday: m.stage === 'Group Stage' ? 1 : null,
      stage: stageMap[m.stage] || m.stage,
      group: gName,
      lastUpdated: m.last_updated,
      homeTeam: {
        id: m.home_team_id || (m.id * 2),
        name: m.home_team,
        shortName: m.home_team,
        crest: m.home_crest
      },
      awayTeam: {
        id: m.away_team_id || (m.id * 2 + 1),
        name: m.away_team,
        shortName: m.away_team,
        crest: m.away_crest
      },
      score: {
        winner: m.status === 'ft' ? (m.home_score > m.away_score ? 'HOME_TEAM' : (m.home_score < m.away_score ? 'AWAY_TEAM' : 'DRAW')) : null,
        duration: 'REGULAR',
        fullTime: {
          home: m.home_score,
          away: m.away_score
        },
        halfTime: {
          home: m.status === 'upcoming' ? null : Math.floor((m.home_score || 0) / 2),
          away: m.status === 'upcoming' ? null : Math.floor((m.away_score || 0) / 2)
        }
      }
    };
  });
}

// -------------------------------------------------------------
// HTTP PROXY & ENDPOINTS SERVER
// -------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Auth-Token, Content-Type');
  
  if (req.method === 'OPTIONS') return res.end();

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  if (pathname.startsWith('/api/') && pathname !== '/api/subscribe') {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'supersecret2026') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized. Invalid admin key.' }));
    }
  }

  // Endpoint: Sync Status Info
  if (pathname === '/api/sync-status') {
    try {
      const logs = await allDb('SELECT * FROM sync_logs ORDER BY id DESC LIMIT 15');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        outages: simulatedOutages,
        currentInterval: currentSyncInterval,
        lastSyncTime: lastSyncTime,
        logs: logs
      }));
    } catch (e) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // Endpoint: Manual Sync Trigger
  if (pathname === '/api/sync-now') {
    try {
      await runSyncJob();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, lastSyncTime: lastSyncTime }));
    } catch (e) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // Endpoint: Toggle Outages
  if (pathname === '/api/toggle-outage') {
    const api = urlObj.searchParams.get('api');
    if (simulatedOutages[api] !== undefined) {
      simulatedOutages[api] = !simulatedOutages[api];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, api: api, disabled: simulatedOutages[api] }));
    } else {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'Invalid API name' }));
    }
  }

  // Endpoint: DB statistics
  if (pathname === '/api/db-stats') {
    try {
      const mCount = await getDb('SELECT COUNT(*) as count FROM matches');
      const tCount = await getDb('SELECT COUNT(*) as count FROM teams');
      const sCount = await getDb('SELECT COUNT(*) as count FROM stadiums');
      const lCount = await getDb('SELECT COUNT(*) as count FROM sync_logs');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        matches: parseInt(mCount.count, 10) || 0,
        teams: parseInt(tCount.count, 10) || 0,
        stadiums: parseInt(sCount.count, 10) || 0,
        logs: parseInt(lCount.count, 10) || 0,
        fileSize: 0 // Local DB file size no longer applies for Postgres
      }));
    } catch (e) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // Endpoint: Subscribe to email
  if (req.method === 'POST' && pathname === '/api/subscribe') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { email } = JSON.parse(body);
        if (!email || typeof email !== 'string' || !email.endsWith('@gmail.com')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Valid @gmail.com address is required' }));
        }

        try {
          await runDb('INSERT INTO subscriptions (email) VALUES ($1)', [email]);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true }));
        } catch (dbErr) {
          if (dbErr.code === '23505') { // Postgres unique violation code
            res.writeHead(409, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'This email is already registered' }));
          }
          throw dbErr;
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Rewrite /fd/competitions/2000/matches to serve from SQLite
  if (pathname.startsWith('/fd/competitions/2000/matches')) {
    try {
      const rows = await allDb('SELECT * FROM matches');
      const formatted = mapMatchesToFootballDataFormat(rows);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ matches: formatted }));
    } catch (e) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // Proxy /fd/... (other metadata routes)
  if (pathname.startsWith('/fd/')) {
    const targetUrl = 'https://api.football-data.org/v4/' + req.url.slice(4);
    const options = { headers: {} };
    options.headers['X-Auth-Token'] = req.headers['x-auth-token'] || API_KEYS['football-data'];
    
    https.get(targetUrl, options, (proxyRes) => {
      const headers = { ...proxyRes.headers };
      delete headers['cross-origin-resource-policy'];
      delete headers['cross-origin-opener-policy'];
      delete headers['x-frame-options'];
      headers['access-control-allow-origin'] = '*';
      
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    }).on('error', (e) => {
      res.writeHead(500);
      res.end(e.message);
    });
    return;
  }

  // Serve Stadiums local copy from DB
  if (pathname === '/get/stadiums') {
    try {
      const rows = await allDb('SELECT * FROM stadiums');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ stadiums: rows }));
    } catch (e) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // Serve Teams local copy from DB
  if (pathname === '/get/teams') {
    try {
      const rows = await allDb('SELECT * FROM teams');
      // format columns back to team object
      const formattedTeams = rows.map(r => ({
        id: r.id.toString(),
        name_en: r.name_en,
        flag: r.flag,
        group: r.group_name
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ teams: formattedTeams }));
    } catch (e) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // Serve Games local copy from DB
  if (pathname === '/get/games') {
    try {
      const rows = await allDb('SELECT * FROM matches');
      const formattedGames = rows.map(r => ({
        id: r.id.toString(),
        home_team_id: r.home_team_id ? r.home_team_id.toString() : null,
        away_team_id: r.away_team_id ? r.away_team_id.toString() : null,
        home_score: r.home_score !== null ? r.home_score.toString() : '0',
        away_score: r.away_score !== null ? r.away_score.toString() : '0',
        stadium_id: r.stadium_id ? r.stadium_id.toString() : null,
        local_date: r.local_date,
        finished: r.status === 'ft' ? 'TRUE' : 'FALSE',
        time_elapsed: r.status === 'live' ? 'live' : 'notstarted',
        type: r.stage === 'Group Stage' ? 'group' : r.stage,
        group: r.group_name && r.group_name.startsWith('Group ') ? r.group_name.split(' ')[1] : null
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ games: formattedGames }));
    } catch (e) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // Serve hero animation frames from local disk
  if (pathname.startsWith('/frames/')) {
    const filename = path.basename(pathname);
    // Only allow safe filenames (frame_NNN.jpg)
    if (!/^frame_\d{3}\.jpg$/.test(filename)) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const filePath = path.join(process.env.FRAMES_PATH || path.join(__dirname, 'fifiaa_frames'), filename);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Frame not found');
      }
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
    return;
  }

  // Static File Serving
  let localFilePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  fs.stat(localFilePath, (err, stats) => {
    if (!err && stats.isFile()) {
      // Serve local file
      const ext = path.extname(localFilePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      fs.readFile(localFilePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500);
          res.end('Error loading local file');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
      return;
    }

    // Default: proxy to worldcup26.ir for raw items (images etc not found locally)
    const targetUrl = 'https://worldcup26.ir' + req.url;
    https.get(targetUrl, (proxyRes) => {
      const headers = { ...proxyRes.headers };
      delete headers['cross-origin-resource-policy'];
      delete headers['cross-origin-opener-policy'];
      delete headers['x-frame-options'];
      headers['access-control-allow-origin'] = '*';
      
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    }).on('error', (e) => {
      res.writeHead(500);
      res.end(e.message);
    });
  });
});

const wss = new WebSocketServer({ server });

// WebSocket Connection Handler
wss.on('connection', async (ws, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log('Client connected to chat from IP:', ip);
  
  if (bannedIps.has(ip)) {
    ws.send(JSON.stringify({
      sender: 'System',
      text: '❌ You are permanently banned from this chat room due to repeated policy violations.'
    }));
    ws.close();
    return;
  }
  
  ws.on('message', async (message) => {
    if (bannedIps.has(ip)) {
      ws.close();
      return;
    }
    
    const dataStr = message.toString();
    console.log('Received chat message:', dataStr);
    
    let msgObj;
    try {
      msgObj = JSON.parse(dataStr);
    } catch (e) {
      return;
    }

    if (msgObj.type === 'toggleSimulation') {
      return;
    }

    if (msgObj.type === 'joinChannel') {
      ws.channel = msgObj.channel || 'ALL';
      return;
    }

    const now = Date.now();
    const dbMatches = await allDb('SELECT * FROM matches');
    const activeMatch = dbMatches.find(m => {
      const start = new Date(m.utc_date).getTime();
      const end = start + (3 * 3600 * 1000);
      return now >= start && now <= end;
    });

    const isDevSimulation = false;

    if (!activeMatch && !isDevSimulation) {
      ws.send(JSON.stringify({
        sender: 'System',
        text: '❌ Message rejected: Chat is only active during scheduled matches.'
      }));
      return;
    }
    
    if (lastMsgTime[ip] && (now - lastMsgTime[ip] < 5000)) {
      const waitSec = Math.ceil((5000 - (now - lastMsgTime[ip])) / 1000);
      ws.send(JSON.stringify({
        sender: 'System',
        text: `⏳ Cooldown active: Please wait ${waitSec}s before sending another message.`
      }));
      return;
    }
    
    if (containsProfanity(msgObj.text || '')) {
      ipViolations[ip] = (ipViolations[ip] || 0) + 1;
      
      if (ipViolations[ip] > 3) {
        bannedIps.add(ip);
        ws.send(JSON.stringify({
          sender: 'System',
          text: '❌ You have been permanently banned from the chat for repeated policy violations.'
        }));
        ws.close();
        return;
      }
      
      ws.send(JSON.stringify({
        sender: 'System',
        text: `⚠️ Warning: Your message contained prohibited content. Violation ${ipViolations[ip]}/3. You will be banned after 3 violations.`
      }));
      return;
    }
    
    if (containsLink(msgObj.text || '')) {
      ipViolations[ip] = (ipViolations[ip] || 0) + 1;
      
      if (ipViolations[ip] > 3) {
        bannedIps.add(ip);
        ws.send(JSON.stringify({
          sender: 'System',
          text: '❌ You have been permanently banned from the chat for repeated policy violations.'
        }));
        ws.close();
        return;
      }
      
      ws.send(JSON.stringify({
        sender: 'System',
        text: `⚠️ Warning: Links are not allowed in the chat. Violation ${ipViolations[ip]}/3. You will be banned after 3 violations.`
      }));
      return;
    }
    
    lastMsgTime[ip] = now;
    delete msgObj.devPasscode;
    broadcastWs(msgObj);
  });

  ws.on('close', () => {
    console.log('Client disconnected from IP:', ip);
  });
});

// Boot operations
async function boot() {
  await initDb();
  await bootstrapDb();

  // Run first sync immediately, then set the adaptive scheduler
  await runSyncJob();
  await determineSyncInterval();

  // Re-evaluate live/off-peak interval every 60 seconds
  setInterval(determineSyncInterval, 60000);

  const PORT = process.env.PORT || 7789;
  server.listen(PORT, () => {
    console.log(`Proxy, WebSocket and Static server running on port ${PORT}.`);
    console.log('  → PostgreSQL DB: Active via DATABASE_URL');
    console.log('  → Sync interval: adaptive (30s live / 300s off-peak)');
    console.log('  → APIs         : API-Football (3) > Football-Data (2) > Sportmonks (1)');
  });
}

boot().catch(console.error);
