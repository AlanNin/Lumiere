import { parseDocument } from "htmlparser2";
import { DomUtils } from "htmlparser2";

export function sanitizeHtml(
  dirtyHtml: string,
  chapterTitle: string,
  chapterNumber: number
) {
  let pCounter = 0;

  const cleanHtml = dirtyHtml
    // 1. Remove all <script>…</script> blocks to prevent embedded JavaScript.
    .replace(/<script[\s\S]*?<\/script>/gi, "")

    // 2. Strip out any <div> with an id like "pf-…" (e.g. page-fragments injected by some renderers).
    .replace(/<div\s+id="pf-[^"]+"[\s\S]*?<\/div>/gi, "")

    // 3. Unescape any "\u003c…\u003e" sequences back into plain HTML tags.
    .replace(/\\u003c([^>]+)\\u003e/g, "$1")

    // 4. Ensure punctuation before a quote has a space after it (e.g. "Hello."&quot;World" → "Hello."&quot; World").
    .replace(/([.!?])\s*&quot;([A-ZÀ-Ú])/g, "$1&quot; $2")

    // 5. Remove translator credits at the start of paragraphs ("Translator: …").
    .replace(/<p>\s*<strong>\s*Translator:[\s\S]*?<\/p>/gi, "")

    // 6. Remove the first two paragraphs if they contain Translator: or TL: (handled specially).
    .replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, (match) => {
      pCounter++;
      if (pCounter <= 2 && /(Translator:|TL:)/i.test(match)) {
        return "";
      }
      return match;
    })

    // 7. Remove any paragraph that contains "TL Notes:".
    .replace(/<p>[\s\S]*?TL Notes:[\s\S]*?<\/p>/gi, "")

    // 8. Remove any paragraph that contains the NovelFire notes instruction.
    .replace(/<p[^>]*>\s*Search the NovelFire\.net[\s\S]*?<\/p>/gi, "")

    // 9. Remove any paragraph containing "http".
    .replace(
      /<p[^>]*>(?:(?!<\/p>)[\s\S])*?http(?:(?!<\/p>)[\s\S])*?<\/p>/gi,
      ""
    )

    // 10. Remove donation link paragraphs.
    .replace(/<p\b[^>]*>[^<]*Link to donations[^<]*<\/p>/gi, "")

    // 11. Remove box-notification paragraphs with NovelFire search text.
    .replace(
      /<p[^>]*class="[^"]*box-notification[^"]*"[^>]*>\s*Search the\s*<b>NovelFire\.net<\/b>\s*website[\s\S]*?<\/p>/gi,
      ""
    )

    // 12. Remove other NovelFire search instruction paragraphs.
    .replace(
      /<p[^>]*>\s*Search the\s*(?:<b>)?NovelFire\.net(?:<\/b>)?\s*website[\s\S]*?<\/p>/gi,
      ""
    )

    // 13. Remove paragraphs that contain "Chapter n:" where n is any number.
    .replace(/<p[^>]*>\s*Chapter\s+\d+:\s*[\s\S]*?<\/p>/gi, "")

    // 13.1. Remove the first paragraph if it contains both the chapter number and the chapter title.
    .replace(/^\s*<p\b[^>]*>[\s\S]*?<\/p>/i, (match) => {
      const low = match.toLowerCase();
      if (
        low.includes(chapterNumber.toString().toLowerCase()) &&
        low.includes(chapterTitle.toLowerCase())
      ) {
        return "";
      }
      return match;
    })

    // 14. Remove the initial paragraph containing just the chapter/episode number and title.
    .replace(
      new RegExp(
        `^\\s*<p[^>]*>\\s*(?:Chapter|Episode)\\s*${chapterNumber}\\b[\\s\\S]*?<\\/p>\\s*`,
        "i"
      ),
      ""
    )

    // 15. Delete any empty <p> tags (including those containing only whitespace or &nbsp;).
    .replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, "")

    // 16. Delete any empty <div> tags (including those containing only whitespace or &nbsp;).
    .replace(/<div>(?:\s|&nbsp;)*<\/div>/gi, "")

    // 17. Collapse stray text between </p> and <p> into its own paragraph if substantial.
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

    // 18. Wrap stray text after closing headings or divs into a new paragraph if substantial.
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

    // 19. Fix paragraphs that start with an opening curly double quote (&#x201C;) but lack a matching closing quote.
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

    // 20. Fix paragraphs that start with &quot; but lack a matching closing &quot;.
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
    })

    // 21. Normalize any run of 4+ dots into exactly three ellipsis.
    .replace(/\.{4,}/g, "...");

  // 22. Extract all paragraph elements for later translator note removal.
  const paragraphs = cleanHtml.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];

  let finalHtml = cleanHtml;

  // 23. Remove trailing translator notes if found in the last few paragraphs.
  if (paragraphs.length > 0) {
    const lastFourStart = Math.max(0, paragraphs.length - 4);
    let foundTranslatorNoteIndex = -1;

    for (let i = lastFourStart; i < paragraphs.length; i++) {
      if (/(Translator Notes:|TL:)/i.test(paragraphs[i])) {
        foundTranslatorNoteIndex = i;
        break;
      }
    }

    if (foundTranslatorNoteIndex !== -1) {
      const paragraphsToKeep = paragraphs.slice(0, foundTranslatorNoteIndex);
      const beforeParagraphs = cleanHtml.split(/<p\b[^>]*>[\s\S]*?<\/p>/gi)[0];
      const afterParagraphs = cleanHtml
        .split(/<p\b[^>]*>[\s\S]*?<\/p>/gi)
        .slice(-1)[0];

      finalHtml =
        beforeParagraphs +
        paragraphsToKeep.join("") +
        (paragraphsToKeep.length > 0 ? afterParagraphs : "");
    }
  }

  // 24. Improvements applied in adjustSpacingAndQuotes
  function adjustSpacingAndQuotes(html: string): string {
    return html
      .split(/(<[^>]+>)/g) // Preserve tags intact.
      .map((segment) => {
        // If this is a tag, leave it unchanged.
        if (/^<[^>]+>$/.test(segment)) return segment;

        let t = segment;

        // 1. Correct closing curly quote used as opening (e.g., &#x201D; misused) and replace with opening curly quote.
        t = t.replace(/([^\s])&#x201D;(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, "$1 &#x201C;");
        t = t.replace(/(^|\s)&#x201D;(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, "$1&#x201C;");

        // 2. Ensure there is a space before an opening curly quote if missing.
        t = t.replace(/([^ \t\r\n])(&#x201C;)(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, "$1 $2");

        // 3. Move comma from before closing curly quote to after it.
        t = t.replace(/,(&#x201D;)/g, "$1,");

        // 4. Move comma from before straight or curly right quote to after it.
        t = t.replace(/,([\"”])/g, "$1,");

        // 5. Move comma from before &quot; to after it.
        t = t.replace(/,(&quot;)/gi, "$1,");

        // 6. Ensure there is a space before straight opening quotes if missing.
        t = t.replace(/([^ \t\r\n])([\"“])(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, "$1 $2");
        t = t.replace(/([^ \t\r\n])(&quot;)(?=[A-Za-zÀ-ÖØ-öø-ÿ])/gi, "$1 $2");

        // 7. Normalize spacing around equals sign.
        t = t.replace(/(\S)=(\S)/g, "$1 = $2");
        t = t.replace(/(\S)=\s/g, "$1 = ");
        t = t.replace(/\s=(\S)/g, " = $1");

        return t;
      })
      .join("");
  }

  return adjustSpacingAndQuotes(finalHtml);
}

export function extractChapterTitle(rawText: string): string {
  let cleanText = rawText.trim();

  // Remove zero-width characters
  cleanText = cleanText.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // If there's an em-dash / en-dash used as a separator, strip everything before the first one
  if (/[—–]/.test(cleanText)) {
    const parts = cleanText.split(/[—–]/);
    // Keep everything after the first dash, rejoining the rest with an em-dash to preserve secondary parts
    cleanText = parts.slice(1).join("—");
  } else {
    // Remove leading "Volume <number>" (and optional decimal), e.g., "Volume 4 3.5", leaving the rest
    cleanText = cleanText.replace(/^Volume\s*\d+(?:\.\d+)?\s*/i, "");
  }

  // Remove leading "Chapter" keyword
  cleanText = cleanText.replace(/^Chapter\s+/i, "");

  // Remove numeric prefixes with separators like "1 - Title" or "2: Title"
  cleanText = cleanText.replace(/^\d+\s*[-–—:]\s*/, "");

  // Remove standalone numeric prefixes like "123 Title"
  cleanText = cleanText.replace(/^\d+\s+/, "");

  // Strip everything before a colon for log-like input
  cleanText = cleanText.replace(/^.*?:\s*/, "");

  cleanText = cleanText.trim();

  // If the remaining text is only digits, return empty
  return /^\d+$/.test(cleanText) ? "" : cleanText;
}

export function insertTitleHtml(
  title: string,
  chapterNumber: number,
  html: string
): string {
  const h4Regex = /<h4>([\s\S]*?)<\/h4>/i;

  if (h4Regex.test(html)) {
    return html.replace(h4Regex, (_match, content) => {
      const cleanedTitle = extractChapterTitle(content);
      return `<h4>Chapter ${chapterNumber} ${
        cleanedTitle ? `- ${cleanedTitle}` : ""
      }</h4>`;
    });
  } else {
    return (
      `<h4>Chapter ${chapterNumber} ${title ? `- ${title}` : ""}</h4>\n` + html
    );
  }
}

export function extractContentFromHTML(
  html: string
): { title: string; paragraphs: string[] } {
  const dom = parseDocument(html);

  const h4 = DomUtils.getElementsByTagName("h4", dom.children)[0];
  const title = h4 ? DomUtils.getText(h4).trim() : "";

  const paragraphs = DomUtils.getElementsByTagName("p", dom.children);
  const paragraphTexts = paragraphs
    .map((p) => DomUtils.getText(p).trim())
    .filter(Boolean);

  return {
    title,
    paragraphs: paragraphTexts,
  };
}
