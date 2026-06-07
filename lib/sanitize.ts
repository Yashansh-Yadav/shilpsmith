// lib/sanitize.ts
//
// Pure-JS HTML sanitizer for admin-authored rich-text product descriptions.
// Descriptions are written in the admin RichTextEditor (contentEditable) and
// rendered to the PUBLIC storefront via dangerouslySetInnerHTML, so even though
// only authenticated admins author them we run an allowlist pass here to keep a
// compromised admin session (or a bad paste) from injecting <script>/onclick/
// javascript: payloads.
//
// This is intentionally dependency-free (no jsdom/DOMPurify) — it runs inside a
// Zod transform in lib/validators.ts, which is imported on both client and
// server, so it must be plain JS with no DOM/Node APIs.

// Block-level + inline tags the editor can emit. <div> is included because
// Chrome's contentEditable wraps lines in <div> by default.
const ALLOWED_TAGS = new Set([
  "p", "br", "div",
  "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li",
  "h2", "h3", "h4",
  "blockquote", "a", "span",
]);

// Strip whole dangerous elements *including their text content*.
function stripDangerousBlocks(html: string): string {
  return html
    .replace(
      /<\s*(script|style|iframe|object|embed|noscript|template)[\s\S]*?<\s*\/\s*\1\s*>/gi,
      ""
    )
    // Orphan/self-closing forms of the same.
    .replace(
      /<\s*(script|style|iframe|object|embed|noscript|template)[^>]*\/?>/gi,
      ""
    );
}

/**
 * Allowlist-sanitize an HTML fragment. Disallowed tags are dropped but their
 * inner text is preserved; all attributes are stripped except a safe `href` on
 * <a> (which is forced to open in a new tab with rel="noopener").
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  let html = stripDangerousBlocks(input);

  html = html.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g,
    (match, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return ""; // drop tag, keep surrounding text

      const closing = match.startsWith("</");
      if (closing) return `</${tag}>`;

      let safeAttrs = "";
      if (tag === "a") {
        const m = attrs.match(
          /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i
        );
        let href = (m ? (m[2] ?? m[3] ?? m[4] ?? "") : "").trim();
        // Block script-bearing protocols.
        if (/^\s*(javascript|data|vbscript):/i.test(href)) href = "";
        if (href) {
          safeAttrs = ` href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer nofollow"`;
        }
      }

      const selfClose = tag === "br" ? " /" : "";
      return `<${tag}${safeAttrs}${selfClose}>`;
    }
  );

  return html.trim();
}

/**
 * Reduce an HTML fragment to plain text — used to derive a plain
 * `shortDescription` (shown in product cards / meta) from a rich description.
 */
export function stripHtml(input: string): string {
  if (!input) return "";
  return stripDangerousBlocks(input)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
