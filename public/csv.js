const aliases = {
  campaign: ['campaign', 'кампания', 'название кампании'],
  impressions: ['impressions', 'показы'], clicks: ['clicks', 'клики'],
  cost: ['cost', 'расход', 'расходы'], leads: ['leads', 'заявки', 'конверсии'],
};

function split(text, delimiter) {
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === delimiter || c === '\n' || c === '\r') {
      row.push(field.trim()); field = ''; closed = false;
      if (c !== delimiter) { if (row.some(v => v !== '')) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else if (c === '"') {
      if (field.trim() || closed) throw new Error('Кавычки внутри поля должны быть удвоены.');
      quoted = true; field = '';
    } else {
      if (closed && c.trim()) throw new Error('После закрывающей кавычки нужен разделитель.');
      field += c;
    }
  }
  if (quoted) throw new Error('Не закрыта кавычка в CSV.');
  row.push(field.trim()); if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

export function parseCSV(input) {
  const text = input.replace(/^\uFEFF/, '');
  if (!text.trim()) throw new Error('Файл пуст. Добавьте заголовки и хотя бы одну строку.');
  const first = text.split(/\r?\n/)[0];
  const delimiter = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = split(text, delimiter);
  const headers = rows.shift().map(h => h.toLowerCase().trim());
  const indexes = {};
  for (const [key, names] of Object.entries(aliases)) {
    const found = headers.flatMap((h, i) => names.includes(h) ? [i] : []);
    if (found.length !== 1) throw new Error(`Нужна ровно одна колонка «${names[1]}» (${key}).`);
    indexes[key] = found[0];
  }
  if (!rows.length) throw new Error('В файле есть заголовки, но нет данных.');
  if (rows.length > 10000) throw new Error('Для MVP поддерживается не больше 10 000 строк.');
  return rows.map((row, i) => {
    if (row.length !== headers.length) throw new Error(`Строка данных ${i + 1}: число полей не совпадает с заголовком.`);
    const result = { campaign: row[indexes.campaign] };
    if (!result.campaign) throw new Error(`Строка данных ${i + 1}: не указана кампания.`);
    for (const key of ['impressions', 'clicks', 'cost', 'leads']) {
      const raw = row[indexes[key]].replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
      const value = Number(raw);
      if (!raw || !/^\d+(\.\d+)?$/.test(raw) || !Number.isFinite(value) || value < 0 || value > 1e12 || (key !== 'cost' && !Number.isSafeInteger(value))) {
        throw new Error(`Строка данных ${i + 1}, ${key}: нужно неотрицательное ${key === 'cost' ? 'число' : 'целое число'} до 1 трлн.`);
      }
      result[key] = value;
    }
    return result;
  });
}
