/**
 * Centralized HTML Sanitizer — Stored XSS Defense (Phase 1.2)
 *
 * Uses `sanitize-html` (pure-JS htmlparser2-based sanitizer). NO jsdom, NO
 * DOMPurify — eliminates the server-side DOM dependency that crashed SEO
 * API route modules in Vercel's Node serverless runtime. Sanitization is
 * synchronous and happens at WRITE-TIME in API routes so that:
 *   1. Sanitization runs once per save, not on every read.
 *   2. The stored HTML is always clean, so existing and new content is safe
 *      to render via `dangerouslySetInnerHTML`.
 *
 * TipTap allowlist: matches the editor's actual output (paragraph, headings,
 * inline marks, lists, blockquote, links, images, code/pre, hr, alignment).
 * Everything else is stripped: <script>, <iframe>, <object>, <embed>,
 * <form>, on* event handlers, javascript:/data: URLs in href/src, etc.
 *
 * NOTE: This module is server-only. It must NOT be imported from client
 * components. Read-path defense is provided by the fact that stored content
 * is already sanitized; legacy rows can be re-sanitized via a one-time
 * migration (see report §4).
 *
 * ── Production Hotfix (SEO API runtime failure) ──
 * Replaced `isomorphic-dompurify` (→ jsdom → native-ish deps that crash on
 * Vercel Node runtime) with `sanitize-html` (pure JS, htmlparser2). Same
 * allowlist, same synchronous contract, same defence-in-depth guarantees.
 * No regex-based replacement — this is a full HTML parser/sanitizer.
 */

import sanitizeHtmlPkg from 'sanitize-html';

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

// Attributes permitted globally. `style` is permitted but filtered via
// `allowedStyles` so ONLY `text-align` survives — this prevents
// `style="background:url(javascript:...)"` and similar attacks.
// `target` is listed for documentation but stripped via transformTags to
// match the prior DOMPurify-default tabnabbing protection (links open in
// the same tab).
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

// The configured sanitizer instance (options are static, so we build once).
const SANITIZER_OPTIONS: sanitizeHtmlPkg.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    '*': ALLOWED_ATTR,
  },
  // Block javascript:, data:, file:, etc. Only http(s), mailto, tel survive.
  // Relative URLs (#anchor, /path) are allowed by default.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: true,
  // Strip data-* attributes (matches prior ALLOW_DATA_ATTR: false).
  allowDataAttributes: false,
  // Discard disallowed tags entirely (don't escape, don't keep content).
  disallowedTagsMode: 'discard',
  // Filter inline `style` to only the allowed properties. sanitize-html
  // parses each declaration and keeps only matching prop+value pairs,
  // so `background: url(...)` is dropped entirely (not in allowlist).
  // NOTE: sanitize-html expects the value to be an ARRAY of RegExp.
  allowedStyles: {
    '*': Object.fromEntries(
      Array.from(ALLOWED_STYLE_PROPS).map((prop) => [
        prop,
        // Allow standard text-align keyword values only. No url(), no
        // expression(), no functions of any kind.
        [/^(left|right|center|justify|start|end)$/i],
      ]),
    ),
  },
  // Strip `target` from <a> to match the prior DOMPurify-default tabnabbing
  // protection. Links open in the same tab (the safer posture).
  transformTags: {
    a: (_tagName, attribs) => {
      delete attribs.target;
      return { tagName: 'a', attribs };
    },
  },
  // Explicitly forbid these tags/attrs even if somehow re-added (defence-
  // in-depth; they are already absent from allowedTags/allowedAttributes).
  // Note: sanitize-html is allowlist-based, so anything NOT in the allow
  // lists is already stripped. These are documented here for clarity.
  // (No equivalent config needed — allowlist enforcement is sufficient.)
};

/**
 * Sanitize owner-authored HTML (blog post content, location content, etc.)
 * before it is written to the database. Synchronous.
 *
 * Defence-in-depth guarantees:
 *   - <script> tags are stripped (not in allowlist).
 *   - All on* event-handler attributes are stripped (not in allowlist).
 *   - javascript: and data: URLs are stripped from href/src (scheme allowlist).
 *   - <iframe>, <object>, <embed>, <form> are stripped (not in allowlist).
 *   - `target="_blank"` is stripped (tabnabbing protection).
 *   - `style` attributes are filtered to only `text-align` (no url(), no
 *     expression(), no behaviour, etc.).
 *
 * Legitimate TipTap output (paragraphs, headings, lists, links, images,
 * code blocks, text-align) is preserved.
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return sanitizeHtmlPkg(input, SANITIZER_OPTIONS);
}

/**
 * Read-path sanitizer (defence-in-depth).
 *
 * Use this when rendering content that MAY have been written before
 * sanitization was enforced (legacy rows). For new content, write-time
 * sanitization is sufficient and this is a no-op-ish safety net.
 *
 * Same allowlist as write-time; safe to call from a Server Component.
 */
export function sanitizeHtmlForRender(input: string): string {
  return sanitizeHtml(input);
}
