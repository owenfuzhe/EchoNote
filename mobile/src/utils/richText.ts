const HTML_TAG_PATTERN = /<\/?(?:p|div|span|h[1-6]|ul|ol|li|blockquote|pre|code|strong|em|u|s|a|img|br|hr)\b/i;

const HTML_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#39|nbsp|amp|lt|gt|quot|apos);/g, (match, entity) => HTML_ENTITIES[entity] ?? match);
}

function renderInline(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

export function isRichTextHtml(content: string) {
  return HTML_TAG_PATTERN.test(content);
}

export function richTextToPlainText(content: string) {
  if (!content) return '';
  if (!isRichTextHtml(content)) {
    return content.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim();
  }

  return decodeHtmlEntities(
    content
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|blockquote|pre)>/gi, '\n\n')
      .replace(/<\/(ul|ol)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\u00a0/g, ' ')
      .trim()
  );
}

export function richTextToPreview(content: string, maxLength = 140) {
  const plain = richTextToPlainText(content);
  if (!plain) return '';
  return plain.length > maxLength ? `${plain.slice(0, maxLength).trim()}...` : plain;
}

export function normalizeContentForEditor(content: string) {
  if (!content?.trim()) return '<p></p>';
  if (isRichTextHtml(content)) return content;

  const normalized = content.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n');
  const html: string[] = [];
  let index = 0;

  const flushParagraph = (buffer: string[]) => {
    if (!buffer.length) return;
    html.push(`<p>${renderInline(buffer.join('\n'))}</p>`);
    buffer.length = 0;
  };

  const paragraphBuffer: string[] = [];

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushParagraph(paragraphBuffer);
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph(paragraphBuffer);
      html.push(`<h${headingMatch[1].length}>${renderInline(headingMatch[2])}</h${headingMatch[1].length}>`);
      index += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph(paragraphBuffer);
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }
      html.push(`<blockquote><p>${renderInline(quoteLines.join('\n'))}</p></blockquote>`);
      continue;
    }

    if (line.startsWith('```')) {
      flushParagraph(paragraphBuffer);
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const bulletMatch = line.match(/^-\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph(paragraphBuffer);
      const items: string[] = [];
      while (index < lines.length) {
        const bulletLine = lines[index].trim();
        const match = bulletLine.match(/^-\s+(.*)$/);
        if (!match) break;
        items.push(`<li><p>${renderInline(match[1])}</p></li>`);
        index += 1;
      }
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph(paragraphBuffer);
      const items: string[] = [];
      while (index < lines.length) {
        const orderedLine = lines[index].trim();
        const match = orderedLine.match(/^\d+\.\s+(.*)$/);
        if (!match) break;
        items.push(`<li><p>${renderInline(match[1])}</p></li>`);
        index += 1;
      }
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const taskMatch = line.match(/^- \[( |x)\]\s+(.*)$/i);
    if (taskMatch) {
      flushParagraph(paragraphBuffer);
      const items: string[] = [];
      while (index < lines.length) {
        const taskLine = lines[index].trim();
        const match = taskLine.match(/^- \[( |x)\]\s+(.*)$/i);
        if (!match) break;
        const checked = match[1].toLowerCase() === 'x';
        items.push(
          `<li data-type="taskItem" data-checked="${checked ? 'true' : 'false'}"><label><input type="checkbox" ${
            checked ? 'checked' : ''
          } /><span></span></label><div><p>${renderInline(match[2])}</p></div></li>`
        );
        index += 1;
      }
      html.push(`<ul data-type="taskList">${items.join('')}</ul>`);
      continue;
    }

    paragraphBuffer.push(line);
    index += 1;
  }

  flushParagraph(paragraphBuffer);
  return html.join('');
}
