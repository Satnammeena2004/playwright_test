#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────
//  generate-report.js
//  Usage: node generate-report.js [input.json] [output.html]
//  Defaults: test-results.json → pretty-report.html
// ──────────────────────────────────────────────────────────────────

// ALL TESTS TABLE
// <div class="all-tests-section">
//   <div class="panel-title">All Tests</div>
//   <table class="test-table">
//     <thead>
//       <tr>
//         <th>#</th><th>Test Name</th><th>File</th><th>Project</th><th>Status</th><th>Duration</th>
//       </tr>
//     </thead>
//     <tbody>
//       ${tests.map((t, i) => `
//       <tr>
//         <td style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:11px">${i+1}</td>
//         <td>${escHtml(t.specTitle)}</td>
//         <td class="test-file">${escHtml(path.basename(t.file))}</td>
//         <td style="font-size:11px;color:var(--muted)">${escHtml(t.project)}</td>
//         <td><span class="chip ${escHtml(t.status)}">${escHtml(t.status)}</span></td>
//         <td class="dur">${formatMs(t.duration)}</td>
//       </tr>`).join('')}
//     </tbody>
//   </table>
// </div>




import fs from 'fs';
import path from 'path';

const inputFile  = process.argv[2] || 'test-results.json';
const outputFile = process.argv[3] || 'pretty-report.html';

if (!fs.existsSync(inputFile)) {
  console.error(`❌  File not found: ${inputFile}`);
  process.exit(1);
}

export function formatDuration(ms) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return `${m}m ${sec}s`;
}

const raw   = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
export const cfg   = raw.config || {};
export const stats = raw.stats  || {};

// ── Flatten all specs ─────────────────────────────────────────────
function flattenSuites(suites, parentFile = '') {
  const out = [];
  for (const suite of (suites || [])) {
    const file = suite.file || parentFile;
    for (const spec of (suite.specs || [])) {
      for (const test of (spec.tests || [])) {
        for (const result of (test.results || [])) {
          out.push({
            file,
            specTitle : spec.title,
            project   : test.projectName,
            status    : result.status,
            duration  : result.duration,
            retry     : result.retry,
            startTime : result.startTime,
            errors    : result.errors || [],
            steps     : result.steps  || [],
          });
        }
      }
    }
    if (suite.suites) out.push(...flattenSuites(suite.suites, file));
  }
  return out;
}

export const allTests = flattenSuites(raw.suites || []);

// ── Deduplicate (keep highest retry per test) ─────────────────────
const byKey = {};
for (const t of allTests) {
  const key = `${t.file}||${t.specTitle}||${t.project}`;
  if (!byKey[key] || t.retry > byKey[key].retry) byKey[key] = t;
}
export const tests = Object.values(byKey);

// ── Summary numbers ───────────────────────────────────────────────
export const total   = tests.length;
export const passed  = tests.filter(t => t.status === 'passed').length;
export const failed  = tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
export const skipped = tests.filter(t => t.status === 'skipped').length;

export const flakySet = new Set();
for (const t of allTests) {
  const key = `${t.file}||${t.specTitle}||${t.project}`;
  if (t.retry > 0 && t.status === 'passed') flakySet.add(key);
}
export const flaky = flakySet.size;

export const passRate    = total > 0 ? Math.round((passed / total) * 100) : 0;
export const totalMs     = typeof stats.duration === 'number' ? stats.duration : 0;
export const durationStr = formatMs(totalMs);

// ── Suite breakdown ───────────────────────────────────────────────
export const suiteMap = {};
for (const t of tests) {
  if (!suiteMap[t.file]) suiteMap[t.file] = { name: t.file, pass:0, fail:0, skip:0, total:0 };
  suiteMap[t.file].total++;
  if (t.status === 'passed') suiteMap[t.file].pass++;
  else if (t.status === 'failed' || t.status === 'timedOut') suiteMap[t.file].fail++;
  else if (t.status === 'skipped') suiteMap[t.file].skip++;
}
export const suites = Object.values(suiteMap);

// ── Config info ───────────────────────────────────────────────────
export const projects   = (cfg.projects || []).map(p => p.name).filter(n => n !== 'setup').join(', ') || 'chromium';
export const version    = cfg.version || '—';
export const workers    = cfg.workers || 1;
export const retries    = (cfg.projects || []).find(p => p.id !== 'setup')?.retries ?? 0;
export const configFile = cfg.configFile ? path.basename(cfg.configFile) : '—';
export const runDate    = stats.startTime
  ? new Date(stats.startTime).toLocaleString('en-IN', { timeZone:'Asia/Kolkata', dateStyle:'medium', timeStyle:'short' })
  : '—';

// ── Failed / Flaky tests ──────────────────────────────────────────
export const failedTests = tests.filter(t => t.status === 'failed' || t.status === 'timedOut');
export const flakyTests  = tests.filter(t => flakySet.has(`${t.file}||${t.specTitle}||${t.project}`));

// ── Helpers ───────────────────────────────────────────────────────
export function formatMs(ms) {
  if (!ms) return '0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return `${m}m ${sec}s`;
}

export function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function failRows() {
  if (!failedTests.length) return `<div class="empty-state">🎉 No failed tests!</div>`;
  return failedTests.map(t => {
    const errMsg = t.errors.length
      ? escHtml(t.errors[0]?.message?.split('\n')[0] || 'Unknown error')
      : 'Test timed out';
    return `
    <div class="fail-item">
      <div class="fail-name">${escHtml(t.specTitle)}</div>
      <div class="fail-meta">${escHtml(t.file)} · ${t.project} · ${formatMs(t.duration)}
        <br/><span class="err-msg">${errMsg}</span>
      </div>
    </div>`;
  }).join('');
}

export function flakyRows() {
  if (!flakyTests.length) return `<div class="empty-state"> No flaky tests detected!</div>`;
  return flakyTests.map(t => {
    const retryCount = allTests
      .filter(x => x.file === t.file && x.specTitle === t.specTitle && x.project === t.project)
      .length - 1;
    return `
    <div class="flaky-item">
      <div>
        <div class="flaky-name">${escHtml(t.specTitle)}</div>
        <div class="flaky-meta">${escHtml(t.file)} · ${t.project}</div>
      </div>
      <div class="retry-badge">${retryCount} retr${retryCount === 1 ? 'y' : 'ies'}</div>
    </div>`;
  }).join('');
}

export function suiteRows() {
  return suites.map(s => {
    const pPct  = s.total ? Math.round((s.pass / s.total) * 100) : 0;
    const fPct  = s.total ? Math.round((s.fail / s.total) * 100) : 0;
    const skPct = s.total ? Math.round((s.skip / s.total) * 100) : 0;
    return `
    <div class="suite-row">
      <div class="suite-name">${escHtml(path.basename(s.name))} <span>${s.pass}/${s.total} passed</span></div>
      <div class="suite-bar">
        <div class="bar-seg pass"  style="width:${pPct}%"></div>
        <div class="bar-seg fail"  style="width:${fPct}%"></div>
        <div class="bar-seg skip"  style="width:${skPct}%"></div>
      </div>
    </div>`;
  }).join('');
}

// ── Timing ────────────────────────────────────────────────────────
export const durations = tests.map(t => t.duration).filter(Boolean);
export const fastest   = durations.length ? formatMs(Math.min(...durations)) : '—';
export const slowest   = durations.length ? formatMs(Math.max(...durations)) : '—';
export const avgMs     = durations.length ? durations.reduce((a,b) => a+b, 0) / durations.length : 0;

// ── Ring math ─────────────────────────────────────────────────────
export const circumference = 2 * Math.PI * 45;
export const overallPill   = failed > 0
  ? `<div class="status-pill warn">⚠ ${failed} Failure${failed>1?'s':''} — Action Needed</div>`
  : `<div class="status-pill ok">✓ All Tests Passed</div>`;

// ══════════════════════════════════════════════════════════════════
//  HTML
// ══════════════════════════════════════════════════════════════════
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>QA Report — ${runDate}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
:root{
  --bg:#0D0F14;--card:#1C2030;--border:#252A3A;
  --pass:#22C55E;--pass-dim:#16311F;
  --fail:#EF4444;--fail-dim:#2E1313;
  --skip:#F59E0B;--flaky:#A78BFA;--flaky-dim:#1E1530;
  --accent2:#818CF8;--text:#E2E8F0;--muted:#64748B;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;padding:32px 24px 56px}
/* HEADER */
.header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:36px}
.badge-env{display:inline-flex;align-items:center;gap:6px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.35);color:var(--accent2);border-radius:999px;padding:4px 14px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;margin-bottom:10px}
.badge-env .dot{width:6px;height:6px;border-radius:50%;background:var(--accent2);box-shadow:0 0 6px var(--accent2);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
h1{font-size:clamp(22px,3vw,32px);font-weight:800;letter-spacing:-.02em;color:#fff}
h1 span{color:var(--accent2)}
.meta-row{display:flex;flex-wrap:wrap;gap:18px;margin-top:10px}
.meta-item{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:5px}
.meta-item strong{color:var(--text);font-weight:500}
/* RING */
.header-right{display:flex;flex-direction:column;align-items:center;gap:4px}
.ring-wrap{position:relative;width:100px;height:100px}
.ring-wrap svg{transform:rotate(-90deg)}
.ring-bg{fill:none;stroke:var(--border);stroke-width:8}
.ring-fill{fill:none;stroke:var(--pass);stroke-width:8;stroke-linecap:round;
  stroke-dasharray:${circumference.toFixed(1)};stroke-dashoffset:${circumference.toFixed(1)};
  filter:drop-shadow(0 0 6px var(--pass));transition:stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)}
.ring-label{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
.ring-label .pct{font-size:22px;font-weight:800;color:var(--pass)}
.ring-label .lbl{font-size:9px;color:var(--muted);font-weight:600;letter-spacing:.05em;text-transform:uppercase}
.ring-caption{font-size:11px;color:var(--muted)}
/* STAT CARDS */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:28px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;position:relative;overflow:hidden;transition:transform .15s}
.stat-card:hover{transform:translateY(-2px)}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:14px 14px 0 0}
.stat-card.total::before{background:#6366F1}.stat-card.passed::before{background:var(--pass)}
.stat-card.failed::before{background:var(--fail)}.stat-card.skipped::before{background:var(--skip)}
.stat-card.flaky::before{background:var(--flaky)}.stat-card.time::before{background:#38BDF8}
.stat-icon{font-size:18px;margin-bottom:10px}
.stat-val{font-size:clamp(26px,4vw,36px);font-weight:800;letter-spacing:-.03em;line-height:1;font-family:'JetBrains Mono',monospace}
.stat-card.total .stat-val{color:var(--accent2)}.stat-card.passed .stat-val{color:var(--pass)}
.stat-card.failed .stat-val{color:var(--fail)}.stat-card.skipped .stat-val{color:var(--skip)}
.stat-card.flaky .stat-val{color:var(--flaky)}.stat-card.time .stat-val{color:#38BDF8;font-size:clamp(18px,2.5vw,24px)}
.stat-label{font-size:12px;color:var(--muted);margin-top:4px}
.stat-pct{position:absolute;top:18px;right:16px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;opacity:.5}
/* PROGRESS */
.progress-section{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:28px}
.progress-header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px}
.progress-title{font-size:13px;font-weight:600}
.progress-legend{display:flex;gap:14px;flex-wrap:wrap}
.legend-item{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)}
.legend-dot{width:8px;height:8px;border-radius:50%}
.bar-track{height:14px;background:var(--border);border-radius:99px;overflow:hidden;display:flex}
.bar-seg{height:100%}.bar-seg.pass{background:var(--pass)}.bar-seg.fail{background:var(--fail)}
.bar-seg.skip{background:var(--skip)}.bar-seg.flaky{background:var(--flaky)}
/* LOWER GRID */
.lower-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
@media(max-width:700px){.lower-grid{grid-template-columns:1fr}}
.panel{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px 22px}
.panel-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.panel-title::after{content:'';flex:1;height:1px;background:var(--border)}
.env-table{width:100%;border-collapse:collapse}
.env-table tr{border-bottom:1px solid var(--border)}
.env-table tr:last-child{border-bottom:none}
.env-table td{padding:9px 0;font-size:12.5px}
.env-table td:first-child{color:var(--muted);font-weight:500;width:42%}
.env-table td:last-child{color:var(--text);font-weight:600;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11.5px}
.suite-list{display:flex;flex-direction:column;gap:12px}
.suite-name{font-size:12.5px;font-weight:600;margin-bottom:5px;display:flex;justify-content:space-between}
.suite-name span{font-size:11px;color:var(--muted);font-weight:400}
.suite-bar{height:7px;background:var(--border);border-radius:99px;overflow:hidden;display:flex}
.fail-list,.flaky-list{display:flex;flex-direction:column;gap:8px}
.fail-item{background:var(--fail-dim);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px 14px}
.fail-name{font-size:12px;font-weight:600;color:var(--fail)}
.fail-meta{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.6}
.err-msg{color:#fca5a5;font-family:'JetBrains Mono',monospace;font-size:10.5px}
.flaky-item{background:var(--flaky-dim);border:1px solid rgba(167,139,250,.2);border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.flaky-name{font-size:12px;font-weight:600;color:var(--flaky)}
.flaky-meta{font-size:11px;color:var(--muted);margin-top:2px}
.retry-badge{background:rgba(167,139,250,.2);color:var(--flaky);border-radius:999px;padding:2px 10px;font-size:10px;font-weight:700;white-space:nowrap}
.empty-state{font-size:13px;color:var(--muted);padding:14px 0;text-align:center}
/* ALL TESTS TABLE */
.all-tests-section{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px 22px;margin-bottom:28px}
.test-table{width:100%;border-collapse:collapse;font-size:12px}
.test-table thead tr{border-bottom:1px solid #334155}
.test-table th{padding:8px 10px;text-align:left;color:var(--muted);font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.test-table tbody tr{border-bottom:1px solid var(--border)}
.test-table tbody tr:hover{background:rgba(255,255,255,.02)}
.test-table tbody tr:last-child{border-bottom:none}
.test-table td{padding:9px 10px;vertical-align:middle}
.test-table td.dur{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);white-space:nowrap}
.chip{display:inline-block;border-radius:999px;padding:2px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.chip.passed{background:rgba(34,197,94,.15);color:var(--pass)}
.chip.failed,.chip.timedOut{background:rgba(239,68,68,.15);color:var(--fail)}
.chip.skipped{background:rgba(245,158,11,.15);color:var(--skip)}
.test-file{font-size:10.5px;color:var(--muted);font-family:'JetBrains Mono',monospace}
/* FOOTER */
.footer{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-top:20px;border-top:1px solid var(--border)}
.footer-left{font-size:11px;color:var(--muted)}
.footer-right{display:flex;gap:10px;flex-wrap:wrap}
.status-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 14px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.status-pill.warn{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:var(--fail)}
.status-pill.ok{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);color:var(--pass)}
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div class="badge-env"><span class="dot"></span>Regression Suite — ${escHtml(projects)}</div>
    <h1>Test Execution <span>Report</span></h1>
    <div class="meta-row">
      <div class="meta-item">📅 <strong>${runDate}</strong></div>
      <div class="meta-item">🌐 Browser <strong>${escHtml(projects)}</strong></div>
      <div class="meta-item">⚙️ Config <strong>${escHtml(configFile)}</strong></div>
      <div class="meta-item">🔁 Workers <strong>${workers}</strong></div>
    </div>
  </div>
  <div class="header-right">
    <div class="ring-wrap">
      <svg viewBox="0 0 100 100" width="100" height="100">
        <circle class="ring-bg" cx="50" cy="50" r="45"/>
        <circle class="ring-fill" id="passRing" cx="50" cy="50" r="45"/>
      </svg>
      <div class="ring-label">
        <div class="pct" id="passRingPct">0%</div>
        <div class="lbl">Pass Rate</div>
      </div>
    </div>
    <div class="ring-caption">Overall Result</div>
  </div>
</div>

<div class="stats-grid">
  <div class="stat-card total">
    <div class="stat-icon"></div>
    <div class="stat-val">${total}</div>
    <div class="stat-label">Total Tests</div>
  </div>
  <div class="stat-card passed">
    <div class="stat-icon"></div>
    <div class="stat-val">${passed}</div>
    <div class="stat-label">Passed</div>
    <div class="stat-pct">${total ? Math.round(passed/total*100) : 0}%</div>
  </div>
  <div class="stat-card failed">
    <div class="stat-icon"></div>
    <div class="stat-val">${failed}</div>
    <div class="stat-label">Failed</div>
    <div class="stat-pct">${total ? Math.round(failed/total*100) : 0}%</div>
  </div>
  <div class="stat-card skipped">
    <div class="stat-icon"></div>
    <div class="stat-val">${skipped}</div>
    <div class="stat-label">Skipped</div>
    <div class="stat-pct">${total ? Math.round(skipped/total*100) : 0}%</div>
  </div>
  <div class="stat-card flaky">
    <div class="stat-icon"></div>
    <div class="stat-val">${flaky}</div>
    <div class="stat-label">Flaky Tests</div>
  </div>
  <div class="stat-card time">
    <div class="stat-icon">⏱</div>
    <div class="stat-val">${durationStr}</div>
    <div class="stat-label">Total Duration</div>
  </div>
</div>

<div class="progress-section">
  <div class="progress-header">
    <div class="progress-title">Test Distribution</div>
    <div class="progress-legend">
      <div class="legend-item"><span class="legend-dot" style="background:var(--pass)"></span>Passed ${total?Math.round(passed/total*100):0}%</div>
      <div class="legend-item"><span class="legend-dot" style="background:var(--fail)"></span>Failed ${total?Math.round(failed/total*100):0}%</div>
      <div class="legend-item"><span class="legend-dot" style="background:var(--flaky)"></span>Flaky ${total?Math.round(flaky/total*100):0}%</div>
      <div class="legend-item"><span class="legend-dot" style="background:var(--skip)"></span>Skipped ${total?Math.round(skipped/total*100):0}%</div>
    </div>
  </div>
  <div class="bar-track">
    <div class="bar-seg pass"  style="width:${total?passed/total*100:0}%"></div>
    <div class="bar-seg fail"  style="width:${total?failed/total*100:0}%"></div>
    <div class="bar-seg flaky" style="width:${total?flaky/total*100:0}%"></div>
    <div class="bar-seg skip"  style="width:${total?skipped/total*100:0}%"></div>
  </div>
</div>

<div class="lower-grid">
  <div class="panel">
    <div class="panel-title">Environment</div>
    <table class="env-table">
      <tr><td>Framework</td><td>Playwright v${escHtml(version)}</td></tr>
      <tr><td>Browsers</td><td>${escHtml(projects)}</td></tr>
      <tr><td>Workers</td><td>${workers}</td></tr>
      <tr><td>Retries</td><td>${retries}</td></tr>
      <tr><td>Timeout</td><td>30 000 ms</td></tr>
      <tr><td>Config File</td><td>${escHtml(configFile)}</td></tr>
      <tr><td>Run Date</td><td>${escHtml(runDate)}</td></tr>
      <tr><td>Duration</td><td>${durationStr}</td></tr>
    </table>
  </div>

  <div class="panel">
    <div class="panel-title">Suite Breakdown</div>
    <div class="suite-list">${suiteRows()}</div>
  </div>

  <div class="panel">
    <div class="panel-title">Failed Tests</div>
    <div class="fail-list">${failRows()}</div>
  </div>

  <div class="panel">
    <div class="panel-title">Flaky Tests (Passed on Retry)</div>
    <div class="flaky-list">${flakyRows()}</div>
    <div style="margin-top:20px">
      <div class="panel-title">Timing Summary</div>
      <table class="env-table">
        <tr><td>Fastest test</td><td>${fastest}</td></tr>
        <tr><td>Slowest test</td><td>${slowest}</td></tr>
        <tr><td>Avg per test</td><td>${formatMs(avgMs)}</td></tr>
        <tr><td>Total run time</td><td>${durationStr}</td></tr>
      </table>
    </div>
  </div>
</div>



<div class="footer">
  <div class="footer-left">
    Generated by <strong>generate-report.js</strong> · Playwright ${escHtml(version)} · ${runDate}
  </div>
  <div class="footer-right">
    ${overallPill}
    ${flaky > 0 ? `<div class="status-pill" style="background:rgba(167,139,250,.12);border:1px solid rgba(167,139,250,.3);color:var(--flaky)">⚡ ${flaky} Flaky</div>` : ''}
  </div>
</div>

<script>
(function(){
  const passRate = ${passRate};
  const circ     = ${circumference.toFixed(1)};
  const target   = circ * (1 - passRate / 100);
  const ring     = document.getElementById('passRing');
  const pctEl    = document.getElementById('passRingPct');
  if (!ring) return;
  setTimeout(() => {
    ring.style.strokeDashoffset = target;
    let cur = 0;
    const step = () => {
      cur = Math.min(cur + 2, passRate);
      pctEl.textContent = cur + '%';
      if (cur < passRate) requestAnimationFrame(step);
    };
    step();
  }, 200);
})();
</script>
</body>
</html>`;

fs.writeFileSync(outputFile, html, 'utf-8');
console.log(`\n✅  Report generated → ${outputFile}`);
console.log(`   Total: ${total}  |  Passed: ${passed}  |  Failed: ${failed}  |  Skipped: ${skipped}  |  Flaky: ${flaky}`);
console.log(`   Pass rate: ${passRate}%  |  Duration: ${durationStr}\n`);