#!/usr/bin/env node
/**
 * cc-night-owl — When does Claude Code actually work?
 *
 * Shows hourly session distribution across all your Claude Code sessions.
 * Are you (or your AI) most active at 3am? Reveals your true work patterns.
 *
 * Zero dependencies. Node.js 18+. ESM.
 *
 * Usage:
 *   npx cc-night-owl            # All-time hourly breakdown
 *   npx cc-night-owl --days=30  # Last 30 days
 *   npx cc-night-owl --utc      # Show UTC instead of local time
 *   npx cc-night-owl --json     # JSON output
 */

import { readdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const HOME = homedir();
const PROJECTS_DIR = join(HOME, '.claude', 'projects');
const MAX_CHUNK = 4 * 1024; // 4KB — enough for first timestamp

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const helpFlag  = args.includes('--help') || args.includes('-h');
const jsonFlag  = args.includes('--json');
const utcFlag   = args.includes('--utc');
const daysArg   = parseInt(args.find(a => a.startsWith('--days='))?.slice(7) ?? '0') || 0;

if (helpFlag) {
  console.log(`cc-night-owl — When does Claude Code actually work?

Usage:
  npx cc-night-owl              All-time hourly breakdown
  npx cc-night-owl --days=30    Last 30 days only
  npx cc-night-owl --utc        Show UTC instead of local time
  npx cc-night-owl --json       JSON output

Output:
  24-hour bar chart with night owl score (% sessions between 22:00-05:59 local)
`);
  process.exit(0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function collectJsonlFiles(dir) {
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) files.push(...await collectJsonlFiles(p));
      else if (e.name.endsWith('.jsonl')) files.push(p);
    }
  } catch {}
  return files;
}

async function readFirstChunk(path) {
  let fh;
  try {
    fh = await open(path, 'r');
    const buf = Buffer.alloc(MAX_CHUNK);
    const { bytesRead } = await fh.read(buf, 0, MAX_CHUNK, 0);
    return buf.subarray(0, bytesRead).toString('utf8');
  } catch { return ''; }
  finally { await fh?.close(); }
}

function extractFirstTimestamp(text) {
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line);
      if (d.timestamp) return new Date(d.timestamp);
    } catch {}
  }
  return null;
}

function getLocalHour(date) {
  // Use local timezone offset
  return date.getHours();
}

function getUtcHour(date) {
  return date.getUTCHours();
}

// ── Main ──────────────────────────────────────────────────────────────────────
const files = await collectJsonlFiles(PROJECTS_DIR);
const cutoff = daysArg > 0 ? Date.now() - daysArg * 86400000 : 0;

const hourCounts = new Array(24).fill(0);
let totalSessions = 0;
let earliest = null, latest = null;

for (const f of files) {
  const chunk = await readFirstChunk(f);
  const ts = extractFirstTimestamp(chunk);
  if (!ts) continue;
  if (cutoff && ts.getTime() < cutoff) continue;

  const hour = utcFlag ? getUtcHour(ts) : getLocalHour(ts);
  hourCounts[hour]++;
  totalSessions++;
  if (!earliest || ts < earliest) earliest = ts;
  if (!latest   || ts > latest)   latest   = ts;
}

if (jsonFlag) {
  const tz = utcFlag ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const nightHours = new Set([22, 23, 0, 1, 2, 3, 4, 5]);
  const nightSessions = [...nightHours].reduce((s, h) => s + hourCounts[h], 0);
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  process.stdout.write(JSON.stringify({
    total_sessions: totalSessions,
    timezone: tz,
    days_range: daysArg || null,
    night_owl_score: totalSessions ? (nightSessions / totalSessions * 100).toFixed(1) : '0.0',
    peak_hour: peakHour,
    hours: hourCounts.map((count, h) => ({ hour: h, count }))
  }, null, 2) + '\n');
  process.exit(0);
}

// ── Terminal output ───────────────────────────────────────────────────────────
const BAR_WIDTH = 28;
const maxVal = Math.max(...hourCounts, 1);
const tz = utcFlag ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone;

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const CYAN   = '\x1b[36m';
const BLUE   = '\x1b[34m';
const YELLOW = '\x1b[33m';
const ORANGE = '\x1b[38;5;208m';
const PURPLE = '\x1b[35m';
const MUTED  = '\x1b[38;5;240m';

function colorBar(hour, filledCount) {
  if (22 <= hour || hour < 6)  return PURPLE; // night
  if (6 <= hour && hour < 12)  return YELLOW;  // morning
  if (12 <= hour && hour < 18) return CYAN;    // afternoon
  return ORANGE;                                // evening
}

function period(hour) {
  if (23 === hour || hour < 4) return '🌙';
  if (hour < 6)                return '🌕';
  if (hour < 12)               return '🌅';
  if (hour < 18)               return '☀️ ';
  if (hour < 22)               return '🌆';
  return '🌙';
}

console.log(`\n${BOLD}cc-night-owl${RESET}${MUTED} — when does your Claude Code session start? (${tz})${RESET}\n`);

const daysLabel = daysArg ? ` (last ${daysArg} days)` : ' (all time)';
console.log(`${MUTED}${totalSessions} sessions${daysLabel}${RESET}\n`);

for (let h = 0; h < 24; h++) {
  const count = hourCounts[h];
  const filled = Math.round(count / maxVal * BAR_WIDTH);
  const empty  = BAR_WIDTH - filled;
  const barColor = colorBar(h, filled);
  const bar = barColor + '█'.repeat(filled) + RESET + MUTED + '░'.repeat(empty) + RESET;
  const isNight = (22 <= h || h < 6);
  const label = `${h.toString().padStart(2, '0')}:00`;
  const countStr = count.toString().padStart(4);
  const highlight = isNight ? PURPLE : DIM;
  console.log(`  ${highlight}${label}${RESET} ${period(h)} ${bar} ${MUTED}${countStr}${RESET}`);
}

// ── Night owl score ───────────────────────────────────────────────────────────
const nightHours = [22, 23, 0, 1, 2, 3, 4, 5];
const nightSessions = nightHours.reduce((s, h) => s + hourCounts[h], 0);
const nightPct = totalSessions ? (nightSessions / totalSessions * 100) : 0;
const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
const peakLabel = `${peakHour.toString().padStart(2, '0')}:00`;

let owlLabel, owlColor;
if (nightPct >= 50)      { owlLabel = '🦉 Full Night Owl';      owlColor = PURPLE; }
else if (nightPct >= 30) { owlLabel = '🌙 Night Owl';            owlColor = BLUE;   }
else if (nightPct >= 15) { owlLabel = '🌆 Evening Worker';       owlColor = ORANGE; }
else                     { owlLabel = '☀️  Day Coder';            owlColor = YELLOW; }

console.log(`\n${MUTED}─────────────────────────────────────────${RESET}`);
console.log(`  ${BOLD}Night sessions${RESET}${MUTED} (22:00–05:59): ${RESET}${owlColor}${nightPct.toFixed(1)}%  ${owlLabel}${RESET}`);
console.log(`  ${BOLD}Peak hour${RESET}${MUTED}:               ${RESET}${CYAN}${peakLabel}${RESET}${MUTED} (${hourCounts[peakHour]} sessions)${RESET}`);

// Period breakdown
const periods = [
  { name: 'Night   (22:00–05:59)', hours: [22,23,0,1,2,3,4,5], color: PURPLE },
  { name: 'Morning (06:00–11:59)', hours: [6,7,8,9,10,11],      color: YELLOW },
  { name: 'Afternoon (12:00–17:59)', hours: [12,13,14,15,16,17], color: CYAN },
  { name: 'Evening (18:00–21:59)', hours: [18,19,20,21],         color: ORANGE },
];
console.log(`\n${MUTED}  Period breakdown:${RESET}`);
for (const p of periods) {
  const cnt = p.hours.reduce((s, h) => s + hourCounts[h], 0);
  const pct = totalSessions ? (cnt / totalSessions * 100).toFixed(1) : '0.0';
  const barLen = Math.round(parseFloat(pct) / 5);
  console.log(`  ${p.color}${p.name.padEnd(28)}${RESET}${MUTED} ${cnt.toString().padStart(4)} sessions  (${pct}%)${RESET}`);
}

console.log(`\n${MUTED}  Tip: npx cc-night-owl --days=7 for recent activity${RESET}\n`);
