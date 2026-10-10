/* EMI Calculator BD — reducing-balance engine, comparison, saved scenarios, i18n.
   No network calls. All data in localStorage. */
'use strict';

const $ = (id) => document.getElementById(id);
const LS_LAST = 'emi-calc-bd:last';
const LS_SCEN = 'emi-calc-bd:scenarios';
const LS_LANG = 'emi-calc-bd:lang';

let lang = 'en';
let currentCalc = null;      // last calculated {amount, rate, n, down, principal, emi, rows, totals}
let fullSchedule = [];       // all rows of current schedule

/* ---------- math ---------- */

// Standard reducing-balance EMI. Returns raw (unrounded) monthly EMI.
function emiRaw(P, annualRatePct, n) {
  const r = annualRatePct / 1200;
  if (n <= 0) throw new Error('tenure');
  if (r === 0) return P / n;
  const f = Math.pow(1 + r, n);
  return P * r * f / (f - 1);
}

// Amortization rows using whole-taka EMI; final month adjusted so balance = 0 exactly.
function buildSchedule(P, annualRatePct, n, emiRounded) {
  const r = annualRatePct / 1200;
  let bal = P;
  const rows = [];
  for (let i = 1; i <= n; i++) {
    const interest = bal * r;
    let principal, payment;
    if (i === n) {
      principal = bal;
      payment = principal + interest;
      bal = 0;
    } else {
      principal = emiRounded - interest;
      payment = emiRounded;
      bal = Math.max(0, bal - principal);
      if (bal < 0.005) bal = 0;
    }
    rows.push({ month: i, payment, principal, interest, balance: bal });
  }
  return rows;
}

function computeLoan(amount, rate, n, down) {
  const principal = amount - down;
  const emi = Math.round(emiRaw(principal, rate, n));
  const rows = buildSchedule(principal, rate, n, emi);
  const totalPayable = rows.reduce((s, x) => s + x.payment, 0);
  const totalInterest = totalPayable - principal;
  return { amount, rate, n, down, principal, emi, rows, totalPayable, totalInterest };
}

/* ---------- formatting ---------- */

// Indian-style digit grouping (lakh/crore), used in Bangladesh: 1,00,000
function inr(n) {
  return Math.round(n).toLocaleString('en-IN');
}
function bdt(n) {
  return '৳' + inr(n);
}
// Compact lakh/crore label
function compact(n) {
  if (n >= 1e7) return (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + (lang === 'bn' ? ' কোটি' : ' Crore');
  if (n >= 1e5) return (n / 1e5).toFixed(2).replace(/\.?0+$/, '') + (lang === 'bn' ? ' লক্ষ' : ' Lakh');
  return null;
}
function money(n) {
  const c = compact(n);
  return c ? bdt(n) + ' (' + c + ')' : bdt(n);
}
function t(key, vars) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  if (vars) for (const k of Object.keys(vars)) s = s.replace('{' + k + '}', vars[k]);
  return s;
}

/* ---------- validation ---------- */

function parseMain() {
  const amount = parseFloat($('amount').value);
  const rate = parseFloat($('rate').value);
  let tenure = parseFloat($('tenure').value);
  const down = $('down').value === '' ? 0 : parseFloat($('down').value);
  const err = $('formError');
  err.hidden = true;
  if (!(amount > 0)) return fail(err, t('errAmount'));
  if (!(rate >= 0 && rate <= 100)) return fail(err, t('errRate'));
  if (!(tenure > 0)) return fail(err, t('errTenure'));
  if ($('tenureUnit').value === 'years') tenure = tenure * 12;
  if (!(tenure >= 1 && tenure <= 360 && Number.isInteger(tenure))) return fail(err, t('errTenure'));
  if (!(down >= 0) || down >= amount) return fail(err, t('errDown'));
  return { amount, rate, n: tenure, down };
}
function fail(err, msg) {
  err.textContent = msg;
  err.hidden = false;
  return null;
}

/* ---------- render ---------- */

const INITIAL_ROWS = 12;

function renderResults(c) {
  currentCalc = c;
  fullSchedule = c.rows;
  $('results').hidden = false;
  $('rEmi').textContent = money(c.emi);
  $('rPrincipal').textContent = money(c.principal);
  $('rInterest').textContent = money(c.totalInterest);
  $('rTotal').textContent = money(c.totalPayable);
  $('rTenure').textContent = c.n + ' ' + t('monthsUnit');
  renderSchedule(INITIAL_ROWS);
  saveLast();
}

function rowHtml(x) {
  return '<tr><td>' + x.month + '</td><td>' + bdt(x.payment) + '</td><td>' + bdt(x.principal) +
    '</td><td>' + bdt(x.interest) + '</td><td>' + bdt(x.balance) + '</td></tr>';
}

function renderSchedule(limit) {
  const body = $('scheduleBody');
  const rows = limit >= fullSchedule.length ? fullSchedule : fullSchedule.slice(0, limit);
  body.innerHTML = rows.map(rowHtml).join('');
  const btn = $('showMoreBtn');
  if (fullSchedule.length > INITIAL_ROWS) {
    btn.hidden = false;
    btn.textContent = limit >= fullSchedule.length
      ? t('showLess')
      : t('showFirst', { n: fullSchedule.length });
    btn.dataset.expanded = limit >= fullSchedule.length ? '1' : '0';
  } else {
    btn.hidden = true;
  }
}

function parseCompare(prefix) {
  const amount = parseFloat($(prefix + '-amount').value);
  const rate = parseFloat($(prefix + '-rate').value);
  const n = parseFloat($(prefix + '-tenure').value);
  if (!(amount > 0) || !(rate >= 0 && rate <= 100) ||
      !(n >= 1 && n <= 360 && Number.isInteger(n))) return null;
  return computeLoan(amount, rate, n, 0);
}

function renderCompare(a, b) {
  $('cmpResults').hidden = false;
  $('cmpA-emi').textContent = money(a.emi);
  $('cmpB-emi').textContent = money(b.emi);
  $('cmpA-interest').textContent = money(a.totalInterest);
  $('cmpB-interest').textContent = money(b.totalInterest);
  $('cmpA-total').textContent = money(a.totalPayable);
  $('cmpB-total').textContent = money(b.totalPayable);
  const v = $('cmpVerdict');
  if (Math.abs(a.totalInterest - b.totalInterest) < 1) {
    v.textContent = t('verdictEqual');
  } else {
    const cheaper = a.totalInterest < b.totalInterest ? 'A' : 'B';
    const other = cheaper === 'A' ? 'B' : 'A';
    const diff = Math.abs(a.totalInterest - b.totalInterest);
    const name = cheaper === 'A' ? t('scenarioA') : t('scenarioB');
    const otherName = other === 'A' ? t('scenarioA') : t('scenarioB');
    v.textContent = t('verdictCheaper', { name, diff: money(diff), other: otherName });
  }
}

/* ---------- saved scenarios ---------- */

function getScenarios() {
  try { return JSON.parse(localStorage.getItem(LS_SCEN) || '[]'); }
  catch (e) { return []; }
}
function setScenarios(list) {
  localStorage.setItem(LS_SCEN, JSON.stringify(list));
}
function renderScenarios() {
  const list = getScenarios();
  const ul = $('scenarioList');
  $('scenarioEmpty').style.display = list.length ? 'none' : '';
  ul.innerHTML = '';
  list.forEach((s, i) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'sc-label';
    label.textContent = s.name + ' — ' + bdt(s.amount) + ' @ ' + s.rate + '%, ' + s.n + ' ' + t('monthsUnit');
    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'btn tiny';
    load.textContent = t('loadBtn');
    load.addEventListener('click', () => {
      $('amount').value = s.amount;
      $('rate').value = s.rate;
      $('tenure').value = s.n;
      $('tenureUnit').value = 'months';
      $('down').value = s.down || 0;
      onCalculate();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn tiny danger';
    del.textContent = t('deleteBtn');
    del.addEventListener('click', () => {
      const l = getScenarios();
      l.splice(i, 1);
      setScenarios(l);
      renderScenarios();
    });
    li.append(label, load, del);
    ul.appendChild(li);
  });
}

function saveLast() {
  if (!currentCalc) return;
  localStorage.setItem(LS_LAST, JSON.stringify({
    amount: currentCalc.amount, rate: currentCalc.rate,
    n: currentCalc.n, down: currentCalc.down
  }));
}
function restoreLast() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_LAST) || 'null');
    if (!s) return;
    $('amount').value = s.amount;
    $('rate').value = s.rate;
    $('tenure').value = s.n;
    $('tenureUnit').value = 'months';
    $('down').value = s.down || 0;
    onCalculate();
  } catch (e) { /* ignore corrupt state */ }
}

/* ---------- i18n ---------- */

function applyLang() {
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
  $('langToggle').textContent = lang === 'bn' ? 'English' : 'বাংলা';
  localStorage.setItem(LS_LANG, lang);
  if (currentCalc) renderResults(currentCalc); // re-render numbers/labels
  renderScenarios();
}

/* ---------- events ---------- */

function onCalculate() {
  const p = parseMain();
  if (!p) return;
  renderResults(computeLoan(p.amount, p.rate, p.n, p.down));
}

function init() {
  lang = localStorage.getItem(LS_LANG) || 'en';
  applyLang();

  $('emiForm').addEventListener('submit', (e) => { e.preventDefault(); onCalculate(); });

  $('showMoreBtn').addEventListener('click', () => {
    const expanded = $('showMoreBtn').dataset.expanded === '1';
    renderSchedule(expanded ? INITIAL_ROWS : fullSchedule.length);
  });

  $('compareBtn').addEventListener('click', () => {
    const err = $('cmpError');
    err.hidden = true;
    const a = parseCompare('cmpA');
    const b = parseCompare('cmpB');
    if (!a || !b) { fail(err, t('errCmp')); return; }
    renderCompare(a, b);
  });

  $('saveScenarioBtn').addEventListener('click', () => {
    const err = $('saveError');
    err.hidden = true;
    if (!currentCalc) { fail(err, t('errCalcFirst')); return; }
    const name = $('scenarioName').value.trim();
    if (!name) { fail(err, t('errName')); return; }
    const list = getScenarios();
    list.push({ name, amount: currentCalc.amount, rate: currentCalc.rate, n: currentCalc.n, down: currentCalc.down });
    setScenarios(list);
    $('scenarioName').value = '';
    renderScenarios();
  });

  $('langToggle').addEventListener('click', () => {
    lang = lang === 'bn' ? 'en' : 'bn';
    applyLang();
  });

  renderScenarios();
  restoreLast();
}

document.addEventListener('DOMContentLoaded', init);
