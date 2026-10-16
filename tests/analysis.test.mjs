import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCSV } from '../public/csv.js';
import { summarize } from '../public/metrics.js';
import { buildReport } from '../public/report.js';

test('CSV → агрегаты → отчёт на воспроизводимом примере', async () => {
  const rows = parseCSV(await readFile(new URL('../public/demo.csv', import.meta.url), 'utf8'));
  const result = summarize(rows, 1500);
  assert.equal(result.totals.cost, 150000);
  assert.equal(result.totals.leads, 151);
  assert.equal(result.campaigns.length, 6);
  assert.equal(result.campaigns.filter(c => c.status !== 'ok').length, 2);
  assert.equal(result.totals.cpl, 150000 / 151);
  const report = buildReport(result, 1500, 'Демо');
  assert.match(report, /150.?000/); assert.match(report, /151/); assert.match(report, /расход без заявок/);
});
test('Объединение повторных кампаний и взвешенные показатели', () => {
  const result = summarize([{campaign:'A', impressions:100, clicks:10, cost:1000, leads:1}, {campaign:'A', impressions:900, clicks:10, cost:500, leads:2}]);
  assert.equal(result.campaigns.length, 1); assert.equal(result.totals.ctr, 2); assert.equal(result.totals.cpl, 500);
});
test('Нулевые знаменатели не превращаются в нулевой CPL или Infinity', () => {
  const result = summarize([{campaign:'A', impressions:0, clicks:0, cost:500, leads:0}]);
  assert.equal(result.totals.cpl, null); assert.equal(result.totals.ctr, null); assert.equal(result.totals.cpc, null); assert.equal(result.campaigns[0].status, 'no-leads');
});
test('Русские заголовки, BOM, десятичная запятая, кавычки и многострочное имя', () => {
  const rows = parseCSV('\uFEFFКампания;Показы;Клики;Расход;Заявки\r\n"А; Б\n""В""";100;10;"1 000,50";2');
  assert.equal(rows[0].campaign, 'А; Б\n"В"'); assert.equal(rows[0].cost, 1000.5);
});
test('Порог CPL изменяет статус; равенство допустимо', () => {
  const rows = [{campaign:'A',impressions:1,clicks:1,cost:1500,leads:1}];
  assert.equal(summarize(rows,1500).campaigns[0].status,'ok'); assert.equal(summarize(rows,1000).campaigns[0].status,'expensive');
});
test('Некорректные CSV не дают ложных результатов', () => {
  for (const text of ['', 'campaign,clicks\nA,1', 'campaign,impressions,clicks,cost,leads\nA,1,1,-3,0', 'campaign,impressions,clicks,cost,leads\nA,1,1,,0', 'campaign,impressions,clicks,cost,leads\n"A,1,1,2,0', 'campaign,impressions,clicks,cost,leads\nA,1,1,2', 'campaign,campaign,impressions,clicks,cost,leads\nA,B,1,1,2,0']) assert.throws(() => parseCSV(text));
});
