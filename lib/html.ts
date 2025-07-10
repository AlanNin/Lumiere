export function sanitizeHtml(dirtyHtml: string) {
  const cleanHtml = dirtyHtml
    // 1. Remove all <script>…</script> blocks to prevent embedded JavaScript.
    .replace(/<script[\s\S]*?<\/script>/gi, "")

    // 2. Strip out any <div> with an id like "pf-…" (e.g. page-fragments injected by some renderers).
    .replace(/<div\s+id="pf-[^"]+"[\s\S]*?<\/div>/gi, "")

    // 3. Unescape any “\u003c…\u003e” sequences back into plain HTML tags.
    .replace(/\\u003c([^>]+)\\u003e/g, "$1")

    // 4. Ensure punctuation before a quote has a space after it (e.g. “Hello.”&quot;World” → “Hello.”&quot; World”).
    .replace(/([.!?])\s*&quot;([A-ZÀ-Ú])/g, "$1&quot; $2")

    // 5. Remove translator credits at the start of paragraphs (“Translator: …”).
    .replace(/<p>\s*<strong>\s*Translator:[\s\S]*?<\/p>/gi, "")

    // 5.1 Remove any <p> that contains “TL Notes:”
    .replace(/<p>[\s\S]*?TL Notes:[\s\S]*?<\/p>/gi, "")

    // 6. Delete any empty <p> tags (including those containing only whitespace or &nbsp;).
    .replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, "")

    // 7. Delete any empty <div> tags (including those containing only whitespace or &nbsp;).
    .replace(/<div>(?:\s|&nbsp;)*<\/div>/gi, "")

    // 8. Collapse stray text between </p> and <p> into its own <p> if it’s substantial.
    .replace(
      /(<\/p>\s*)((?:[^<\r\n]+(?:\r?\n[^<\r\n]*)*)+)(\s*<p>)/gi,
      (match, prefix, content, suffix) => {
        const trimmedContent = content.trim();
        if (trimmedContent && trimmedContent.length > 10) {
          return `${prefix}<p>${trimmedContent}</p>${suffix}`;
        }
        return match;
      }
    )

    // 9. Similarly, wrap stray text after closing headings or divs into a new <p> if it’s substantial.
    .replace(
      /(<\/(?:h[1-6]|div)>\s*)((?:[^<\r\n]+(?:\r?\n[^<\r\n]*)*)+)(\s*<(?:h[1-6]|div|p))/gi,
      (match, prefix, content, suffix) => {
        const trimmedContent = content.trim();
        if (trimmedContent && trimmedContent.length > 10) {
          return `${prefix}<p>${trimmedContent}</p>${suffix}`;
        }
        return match;
      }
    )

    // 10. Fix paragraphs that start with an opening double‐quote entity (&#x201C;) but lack a matching closing quote.
    .replace(/<p>([\s\S]*?)<\/p>/gi, (match) => {
      if (/^<p>\s*&#x201C;/.test(match)) {
        const hasClosing =
          /&#x201C;(\s*<\/p>)$/.test(match) || /&#x201D;/.test(match);
        if (!hasClosing) {
          let updated = match.replace(/\s*<\/p>$/, "&#x201C;</p>");
          updated = updated.replace(/,&#x201C;/g, ".&#x201C;");
          return updated;
        }
      }
      return match;
    })

    // 11. Fix paragraphs that start with &quot; but lack a matching closing &quot;.
    .replace(/<p>([\s\S]*?)<\/p>/gi, (match) => {
      if (/^<p>\s*&quot;/.test(match)) {
        const hasClosing = /&quot;(\s*<\/p>)$/.test(match);
        if (!hasClosing) {
          let updated = match.replace(/\s*<\/p>$/, "&quot;</p>");
          updated = updated.replace(/,&quot;/g, ".&quot;");
          return updated;
        }
      }
      return match;
    });

  return cleanHtml;
}

export function extractChapterTitle(rawText: string): string {
  let cleanText = rawText.trim();

  cleanText = cleanText.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");

  cleanText = cleanText.replace(/^Chapter\s+/i, "");

  cleanText = cleanText.trim();

  cleanText = cleanText.replace(/^\d+\s*[-–—:]\s*/, "");

  cleanText = cleanText.replace(/^\d+\s+/, "");

  return cleanText.trim();
}

export function insertTitleHtml(
  title: string,
  chapterNumber: number,
  html: string
): string {
  const h4Regex = /<h4>([\s\S]*?)<\/h4>/i;

  if (h4Regex.test(html)) {
    return html.replace(h4Regex, (_match, content) => {
      const cleanedContent = extractChapterTitle(content);
      return `<h4>Chapter ${chapterNumber} - ${cleanedContent}</h4>`;
    });
  } else {
    return `<h4>Chapter ${chapterNumber} - ${title}</h4>\n` + html;
  }
}
