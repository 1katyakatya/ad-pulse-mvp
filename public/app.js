import { parseCSV } from './csv.js';
import { summarize } from './metrics.js';
import { buildReport } from './report.js';

const $ = id => document.getElementById(id);
const num = (v, digits = 0) => v === null ? '—' : new Intl.NumberFormat('ru-RU', {maximumFractionDigits: digits}).format(v);
const rub = v => v === null ? '—' : `${num(v)} ₽`;
const pct = v => v === null ? '—' : `${num(v, 2)}%`;
let rows = [], analysis = null, onlyProblems = false, target = 1500, source = 'Демонстрационные данные';
let loadVersion = 0;
function element(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
function message(text, error = false) { $('message').textContent = text; $('message').className = error ? 'error' : ''; }
function insight(title, detail, good = false) {
  const el = element('div', undefined, `insight${good ? ' good' : ''}`);
  el.append(element('span', good ? '↗' : '!', 'insight-mark'));
  const text = element('div'); text.append(element('strong', title), element('p', detail)); el.append(text); return el;
}
function render() {
  analysis = summarize(rows, target);
  const {totals: t, campaigns} = analysis;
  $('source-name').textContent = source;
  $('campaign-count').textContent = `${campaigns.length} кампаний в обзоре`;
  $('total-cost').textContent = rub(t.cost); $('total-impressions').textContent = `${num(t.impressions)} показов`;
  $('total-clicks').textContent = num(t.clicks); $('total-ctr').textContent = `CTR ${pct(t.ctr)} · CPC ${rub(t.cpc)}`;
  $('total-leads').textContent = num(t.leads); $('total-cr').textContent = `Конверсия в заявку ${pct(t.cr)}`;
  $('total-cpl').textContent = rub(t.cpl); $('target-note').textContent = `Цель: не более ${rub(target)}`;
  const problems = campaigns.filter(c => c.status !== 'ok');
  $('problem-count').textContent = problems.length;
  const visible = onlyProblems ? problems : campaigns;
  $('table-body').replaceChildren();
  for (const c of visible) {
    const tr = element('tr');
    for (const v of [c.campaign, rub(c.cost), num(c.clicks), pct(c.ctr), num(c.leads), rub(c.cpl)]) tr.append(element('td', v));
    const status = element('td');
    status.append(element('span', c.status === 'no-leads' ? 'Без заявок' : c.status === 'expensive' ? 'CPL выше цели' : c.cost === 0 ? 'Нет расходов' : 'В пределах цели', `badge ${c.status}`)); tr.append(status); $('table-body').append(tr);
  }
  if (!visible.length) { const tr = element('tr'), td = element('td', 'По выбранному порогу кампаний, требующих внимания, нет.', 'empty'); td.colSpan = 7; tr.append(td); $('table-body').append(tr); }
  $('visible-count').textContent = `Показано ${visible.length} из ${campaigns.length} кампаний`;
  $('all').classList.toggle('selected', !onlyProblems); $('problems').classList.toggle('selected', onlyProblems);
  $('all').setAttribute('aria-pressed', String(!onlyProblems)); $('problems').setAttribute('aria-pressed', String(onlyProblems));
  $('chart').replaceChildren();
  const max = Math.max(...campaigns.map(c => c.cost), 1);
  for (const c of campaigns.slice(0, 6)) {
    const bar = element('div', undefined, 'bar-row'); const name = element('span', c.campaign, 'bar-name'); name.title = c.campaign;
    const track = element('div', undefined, 'bar-track'), fill = element('div', undefined, 'bar-fill'); fill.style.width = `${c.cost / max * 100}%`; track.append(fill);
    bar.append(name, track, element('span', num(c.cost), 'bar-value')); $('chart').append(bar);
  }
  if (campaigns.length > 6) $('chart').append(element('p', `Показаны 6 кампаний с наибольшим расходом из ${campaigns.length}.`, 'insights-note'));
  const insights = $('insights'); insights.replaceChildren();
  const noLeads = campaigns.filter(c => c.status === 'no-leads'), expensive = campaigns.filter(c => c.status === 'expensive');
  if (noLeads.length) insights.append(insight(`${noLeads.length} камп. с расходом без заявок`, `${rub(noLeads.reduce((s, c) => s + c.cost, 0))} расхода. Проверьте цели, аудиторию и посадочную страницу.`));
  if (expensive.length) insights.append(insight(`${expensive.length} камп. с CPL выше цели`, `Цель — ${rub(target)}. Проверьте запросы, площадки и качество заявок.`));
  const best = campaigns.filter(c => c.leads > 0 && c.cost > 0).sort((a, b) => a.cpl - b.cpl)[0];
  if (best) insights.append(insight(`Самый низкий CPL: ${rub(best.cpl)}`, `${best.campaign} · ${num(best.leads)} заявок. Учитывайте их качество.`, true));
  if (!insights.childElementCount) insights.append(insight('Недостаточно данных для выводов', 'Проверьте, есть ли в файле расходы и заявки.'));
}
async function loadDemo() {
  const version = ++loadVersion;
  try {
    const response = await fetch('./demo.csv'); if (!response.ok) throw new Error('Не удалось загрузить пример.');
    const parsed = parseCSV(await response.text()); if (version !== loadVersion) return;
    rows = parsed; source = 'Демонстрационные данные'; $('source-detail').textContent = 'Вымышленные кампании · пример работы сервиса'; message(''); render();
  } catch (err) { if (version === loadVersion) message(err.message, true); }
}
$('demo').addEventListener('click', loadDemo);
$('upload').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  const version = ++loadVersion;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('Файл больше 2 МБ. Выберите меньшую выгрузку.');
    const decoded = new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer());
    const parsed = parseCSV(decoded); if (version !== loadVersion) return;
    rows = parsed; source = file.name; $('source-detail').textContent = `${parsed.length} строк данных · обработано в вашем браузере`; message('Файл загружен. Показатели обновлены.'); render();
  } catch (err) { if (version === loadVersion) message(err instanceof TypeError ? 'Не удалось прочитать UTF-8. Сохраните CSV в кодировке UTF-8.' : err.message, true); }
  finally { event.target.value = ''; }
});
$('target').addEventListener('input', () => {
  const value = Number($('target').value);
  if (!Number.isFinite(value) || value < 1 || value > 1e9) { $('target').setAttribute('aria-invalid', 'true'); message('Цель CPL должна быть от 1 до 1 000 000 000 ₽. Пока используется последнее корректное значение.', true); return; }
  $('target').removeAttribute('aria-invalid'); target = value; message(''); if (rows.length) render();
});
$('all').addEventListener('click', () => { onlyProblems = false; if (rows.length) render(); });
$('problems').addEventListener('click', () => { onlyProblems = true; if (rows.length) render(); });
$('download').addEventListener('click', () => {
  if (!analysis) return;
  const blob = new Blob(['\uFEFF', buildReport(analysis, target, source)], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob), a = element('a'); a.href = url; a.download = 'ad-pulse-report.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
loadDemo();
