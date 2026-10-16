const number = value => value === null ? 'нет данных' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
export function buildReport(analysis, target, source) {
  const {totals: t, campaigns} = analysis;
  const lines = ['ПУЛЬС РЕКЛАМЫ — ОТЧЁТ', `Источник: ${source}`, `Сформирован: ${new Date().toLocaleString('ru-RU')}`, `Цель CPL: ${number(target)} руб.`, '',
    `Кампаний: ${campaigns.length}`, `Расход: ${number(t.cost)} руб.`, `Показы: ${number(t.impressions)}`, `Клики: ${number(t.clicks)}`, `Заявки: ${number(t.leads)}`, `CTR: ${number(t.ctr)}%`, `CPC: ${number(t.cpc)} руб.`, `CR: ${number(t.cr)}%`, `CPL: ${number(t.cpl)} руб.`, '', 'КАМПАНИИ'];
  for (const c of campaigns) lines.push(`${c.campaign}: расход ${number(c.cost)} руб.; заявки ${c.leads}; CPL ${number(c.cpl)} руб.; ${c.status === 'no-leads' ? 'расход без заявок' : c.status === 'expensive' ? 'CPL выше цели' : c.cost === 0 ? 'нет расходов' : 'CPL в пределах цели'}.`);
  lines.push('', 'ЧТО ПРОВЕРИТЬ');
  const signals = campaigns.filter(c => c.status !== 'ok');
  if (!signals.length) lines.push('По выбранному порогу проблемных кампаний нет. Проверьте качество заявок и полноту данных.');
  for (const c of signals) lines.push(c.status === 'no-leads' ? `- ${c.campaign}: проверить работу целей, соответствие аудитории и посадочной страницы; расход без заявок ${number(c.cost)} руб.` : `- ${c.campaign}: проверить запросы, площадки и качество заявок; CPL ${number(c.cpl)} руб. при цели ${number(target)} руб.`);
  lines.push('', 'ОГРАНИЧЕНИЯ', 'Автоматические сигналы основаны на правилах, а не на ИИ. Они не доказывают неэффективность кампании и не меняют рекламу. Для выводов об окупаемости нужны выручка, качество заявок и корректная атрибуция. Отчёт относится ко всему загруженному файлу; период задаёт пользователь при выгрузке.');
  return lines.join('\n');
}
