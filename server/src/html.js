import sanitizeHtml from 'sanitize-html';

// Article bodies are written with the admin's button editor and stored as HTML. Only this small set of tags is ever
// kept; everything else (scripts, styles, event handlers, images, ...) is stripped. Tables are plain: no attributes.
const OPTIONS = {
  allowedTags: ['h2', 'h3', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    b: 'strong',
    i: 'em',
    div: 'p',
    a: (tagName, attribs) => ({
      tagName,
      attribs: { href: attribs.href || '', target: '_blank', rel: 'noopener noreferrer' },
    }),
  },
};

export const cleanHtml = (html) => sanitizeHtml(String(html ?? ''), OPTIONS).trim();

// Articles written before the editor existed are plain text (paragraphs separated by blank lines).
export const looksLikeHtml = (text) => /<\/?[a-z][\s\S]*?>/i.test(String(text ?? ''));

// True when the HTML has no visible text (e.g. an empty paragraph).
export const isEmptyHtml = (html) => sanitizeHtml(String(html ?? ''), { allowedTags: [], allowedAttributes: {} }).trim() === '';
