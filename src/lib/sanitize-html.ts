/**
 * Centralized HTML Sanitizer — Stored XSS Defense (Phase 1.2)
 *
 * Uses `isomorphic-dompurify` (DOMPurify + jsdom server-side, native DOM
 * client-side). Sanitization happens at WRITE-TIME in API routes so that:
 *   1. Sanitization runs once per save, not on every read.
 *   2. The server-side jsdom dependency never enters the client bundle.
 *   3. The stored HTML is always clean, so existing and new content is safe
 *      to render via `dangerouslySetInnerHTML`.
 *
 * TipTap allowlist: matches the editor's actual output (paragraph, headings,
 * inline marks, lists, blockquote, links, images, code/pre, hr, alignment).
 * Everything else is stripped: <script>, <iframe>, <object>, <embed>,
 * <form>, on* event handlers, javascript:/data: URLs in href/src, etc.
 *
 * NOTE: This module is server-only. It must NOT be imported from client
 * components (jsdom would balloon the client bundle). Read-path defense is
 * provided by the fact that stored content is already sanitized; legacy
 * rows can be re-sanitized via a one-time migration (see report §4).
 */

import DOMPurify from 'isomorphic-dompurify';

// --- TipTap-aligned allowlist ---------------------------------------------
// Tags produced by StarterKit + Heading + Image + Link + TextAlign +
// Underline + Highlight extensions. Anything outside this set is stripped.
const ALLOWED_TAGS = [
  // Block text
  'p', 'br', 'hr',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Inline marks
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'mark', 'sub', 'sup', 'small',
  // Lists
  'ul', 'ol', 'li',
  // Blockquote & code
  'blockquote', 'pre', 'code',
  // Links & images
  'a', 'img',
  // Tables (not in StarterKit by default, but allow for safety)
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  // Generic container (TipTap sometimes wraps alignment in div/span)
  'div', 'span',
];

// Attributes permitted globally. `style` is permitted but filtered via a
// hook so ONLY `text-align` (and a small safe subset) survives — this
// prevents `style="background:url(javascript:...)"` and similar attacks.
const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'width', 'height',
  'target', 'rel',
  'class', 'style',
  'colspan', 'rowspan',
];

// Style properties allowed in the `style="..."` attribute. Anything else is
// stripped. TipTap TextAlign only emits `text-align`, so we keep the set
// intentionally tiny.
const ALLOWED_STYLE_PROPS = new Set([
  'text-align',
]);

// Hooks must be registered exactly once per process.
let hooksInstalled = false;
function ensureHooksInstalled() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  // Sanitize attributes AFTER DOMPurify's own pass: enforce safe rel on
  // <a target="_blank"> and filter style properties down to the allowlist.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!node || typeof node.setAttribute !== 'function') return;

    // --- Links: force safe rel when opening in a new tab ---
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      const existing = node.getAttribute('rel') || '';
      const relParts = new Set(existing.split(/\s+/).filter(Boolean));
      relParts.add('noopener');
      relParts.add('noreferrer');
      node.setAttribute('rel', Array.from(relParts).join(' '));
    }

    // --- Strip any remaining on* event-handler attributes (defensive) ---
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
      }
      // Block javascript: and data: in href/src as a second layer
      if (name === 'href' || name === 'src') {
        const v = (attr.value || '').trim().toLowerCase();
        if (v.startsWith('javascript:') || v.startsWith('data:')) {
          node.removeAttribute(attr.name);
        }
      }
    }

    // --- Filter `style` attribute down to allowed properties ---
    const style = node.getAttribute('style');
    if (style) {
      const kept: string[] = [];
      for (const decl of style.split(';')) {
        const idx = decl.indexOf(':');
        if (idx === -1) continue;
        const prop = decl.slice(0, idx).trim().toLowerCase();
        const val = decl.slice(idx + 1).trim();
        if (!prop || !val) continue;
        if (ALLOWED_STYLE_PROPS.has(prop)) {
          // Disallow any url() in the value as a hard rule.
          if (/url\s*\(/i.test(val)) continue;
          kept.push(`${prop}: ${val}`);
        }
      }
      if (kept.length > 0) {
        node.setAttribute('style', kept.join('; '));
      } else {
        node.removeAttribute('style');
      }
    }
  });
}

/**
 * Sanitize owner-authored HTML (blog post content, location content, etc.)
 * before it is written to the database.
 *
 * Defence-in-depth guarantees:
 *   - <script> tags are stripped.
 *   - All on* event-handler attributes are stripped.
 *   - javascript: and data: URLs are stripped from href/src.
 *   - <iframe>, <object>, <embed>, <form> are stripped (not in allowlist).
 *   - External links are forced to open safely (rel="noopener noreferrer").
 *   - `style` attributes are filtered to only `text-align` (no url(), no
 *     expression(), no behaviour, etc.).
 *
 * Legitimate TipTap output (paragraphs, headings, lists, links, images,
 * code blocks, text-align) is preserved.
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';

  ensureHooksInstalled();

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // NOTE: DOMPurify by default strips `target` (tabnabbing protection).
    // We do NOT override this — links open in the same tab, which is the
    // safer posture. If `target` is explicitly added back in a future
    // revision, the afterSanitizeAttributes hook will add
    // rel="noopener noreferrer" to keep the tabnabbing vector closed.
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'option', 'style', 'link', 'meta', 'base'],
    FORBID_ATTR: ['srcset', 'formaction', 'xlink:href'],
    // Allow http(s), mailto, tel, relative (#, /). Block javascript:, data:, file:, etc.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|#|\/)/i,
  });
}

/**
 * Read-path sanitizer (defence-in-depth).
 *
 * Use this when rendering content that MAY have been written before
 * sanitization was enforced (legacy rows). For new content, write-time
 * sanitization is sufficient and this is a no-op-ish safety net.
 *
 * Same allowlist as write-time; safe to call from a Server Component (it
 * runs on the server, where jsdom is available).
 */
export function sanitizeHtmlForRender(input: string): string {
  return sanitizeHtml(input);
}
