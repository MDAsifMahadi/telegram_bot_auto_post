// HTML স্পেশাল ক্যারেক্টার সঠিকভাবে Escape করা
export function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Telegram entities থেকে HTML ট্যাগ যুক্ত করে টেক্সট ফরম্যাট করা (নেস্টেড সাপোর্ট সহ)
export function formatMessage(text, entities = []) {
  if (!entities || entities.length === 0) return escapeHTML(text);

  const insertions = {};

  for (const entity of entities) {
    let startTag = '', endTag = '';

    const safeText = escapeHTML(text.slice(entity.offset, entity.offset + entity.length));

    switch (entity.className) {
      case 'MessageEntityBold':        startTag = '<b>'; endTag = '</b>'; break;
      case 'MessageEntityItalic':      startTag = '<i>'; endTag = '</i>'; break;
      case 'MessageEntityUnderline':   startTag = '<u>'; endTag = '</u>'; break;
      case 'MessageEntityStrike':      startTag = '<s>'; endTag = '</s>'; break;
      case 'MessageEntityCode':        startTag = '<code>'; endTag = '</code>'; break;
      case 'MessageEntityPre':         startTag = '<pre>'; endTag = '</pre>'; break;
      case 'MessageEntitySpoiler':     startTag = '<span class="tg-spoiler">'; endTag = '</span>'; break;
      case 'MessageEntityBlockquote':  startTag = '<blockquote>'; endTag = '</blockquote>'; break;
      case 'MessageEntityTextUrl':
        const safeUrl = entity.url ? entity.url.replace(/"/g, '&quot;') : '#';
        startTag = `<a href="${safeUrl}">`; endTag = '</a>';
        break;
    }

    if (!insertions[entity.offset]) insertions[entity.offset] = { open: [], close: [] };
    if (!insertions[entity.offset + entity.length]) insertions[entity.offset + entity.length] = { open: [], close: [] };

    insertions[entity.offset].open.push(startTag);
    insertions[entity.offset + entity.length].close.unshift(endTag);
  }

  let result = '';

  for (let i = 0; i <= text.length; i++) {
    if (insertions[i]?.open) result += insertions[i].open.join('');
    if (i < text.length) result += escapeHTML(text[i]);
    if (insertions[i + 1]?.close) result += insertions[i + 1].close.join('');
  }

  return result;
}
