import { parseDocument } from 'htmlparser2';
import { DomUtils } from 'htmlparser2';

export function sanitizeHtml(dirtyHtml: string, chapterTitle: string, chapterNumber: number) {
  let pCounter = 0;

  const cleanHtml = dirtyHtml
    // 1. Remove all <script>…</script> blocks to prevent embedded JavaScript.
    .replace(/<script[\s\S]*?<\/script>/gi, '')

    // 2. Strip out any <div> with an id like "pf-…" (e.g. page-fragments injected by some renderers).
    .replace(/<div\s+id="pf-[^"]+"[\s\S]*?<\/div>/gi, '')

    // 3. Unescape any "\u003c…\u003e" sequences back into plain HTML tags.
    .replace(/\\u003c([^>]+)\\u003e/g, '$1')

    // 4. Ensure punctuation before a quote has a space after it (e.g. "Hello."&quot;World" → "Hello."&quot; World").
    .replace(/([.!?])\s*&quot;([A-ZÀ-Ú])/g, '$1&quot; $2')

    // 5. Remove translator credits at the start of paragraphs ("Translator: …").
    .replace(/<p>\s*<strong>\s*Translator:[\s\S]*?<\/p>/gi, '')

    // 6. Remove the first two paragraphs if they contain Translator: or TL: (handled specially).
    .replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, (match) => {
      pCounter++;
      if (pCounter <= 2 && /(Translator:|TL:)/i.test(match)) {
        return '';
      }
      return match;
    })

    // 7. Remove any paragraph that contains "TL Notes:".
    .replace(/<p>[\s\S]*?TL Notes:[\s\S]*?<\/p>/gi, '')

    // 8. Remove any paragraph that contains the NovelFire notes instruction.
    .replace(/<p[^>]*>\s*Search the NovelFire\.net[\s\S]*?<\/p>/gi, '')

    // 9. Remove any paragraph containing "http".
    .replace(/<p[^>]*>(?:(?!<\/p>)[\s\S])*?http(?:(?!<\/p>)[\s\S])*?<\/p>/gi, '')

    // 10. Remove donation link paragraphs.
    .replace(/<p\b[^>]*>[^<]*Link to donations[^<]*<\/p>/gi, '')

    // 11. Remove box-notification paragraphs with NovelFire search text.
    .replace(
      /<p[^>]*class="[^"]*box-notification[^"]*"[^>]*>\s*Search the\s*<b>NovelFire\.net<\/b>\s*website[\s\S]*?<\/p>/gi,
      ''
    )

    // 12. Remove other NovelFire search instruction paragraphs.
    .replace(
      /<p[^>]*>\s*Search the\s*(?:<b>)?NovelFire\.net(?:<\/b>)?\s*website[\s\S]*?<\/p>/gi,
      ''
    )

    // 13. Remove paragraphs that contain "Chapter n:" where n is any number.
    .replace(/<p[^>]*>\s*Chapter\s+\d+:\s*[\s\S]*?<\/p>/gi, '')

    // 13.1. Remove the first paragraph if it contains both the chapter number and the chapter title.
    .replace(/^\s*<p\b[^>]*>[\s\S]*?<\/p>/i, (match) => {
      const low = match.toLowerCase();
      if (
        low.includes(chapterNumber.toString().toLowerCase()) &&
        low.includes(chapterTitle.toLowerCase())
      ) {
        return '';
      }
      return match;
    })

    // 14. Remove the initial paragraph containing just the chapter/episode number and title.
    .replace(
      new RegExp(
        `^\\s*<p[^>]*>\\s*(?:Chapter|Episode)\\s*${chapterNumber}\\b[\\s\\S]*?<\\/p>\\s*`,
        'i'
      ),
      ''
    )

    // 15. Delete any empty <p> tags (including those containing only whitespace or &nbsp;).
    .replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, '')

    // 16. Delete any empty <div> tags (including those containing only whitespace or &nbsp;).
    .replace(/<div>(?:\s|&nbsp;)*<\/div>/gi, '')

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
        const hasClosing = /&#x201D;/.test(match);
        if (!hasClosing) {
          let updated = match.replace(/\s*<\/p>$/, '&#x201D;</p>');
          updated = updated.replace(/,&#x201D;/g, '.&#x201D;');
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
          let updated = match.replace(/\s*<\/p>$/, '&quot;</p>');
          updated = updated.replace(/,&quot;/g, '.&quot;');
          return updated;
        }
      }
      return match;
    })

    // 21. Normalize any run of 4+ dots into exactly three ellipsis.
    .replace(/\.{4,}/g, '...');

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
      const afterParagraphs = cleanHtml.split(/<p\b[^>]*>[\s\S]*?<\/p>/gi).slice(-1)[0];

      finalHtml =
        beforeParagraphs +
        paragraphsToKeep.join('') +
        (paragraphsToKeep.length > 0 ? afterParagraphs : '');
    }
  }

  // 24. Improvements applied in adjustSpacingAndQuotes
  function adjustSpacingAndQuotes(html: string): string {
    const QUOTE_TOKEN_RE = /(&quot;|&#x201C;|&#x201D;|["“”])/g;

    function closingFor(open: string): string {
      if (open === '&#x201C;' || open === '“') return '&#x201D;';
      // &quot; and straight " both close with the same token in your HTML
      return open;
    }

    function fixQuotesStatefully(text: string): string {
      // Split into [text, quote, text, quote, ...]
      const parts = text.split(QUOTE_TOKEN_RE);

      let inQuote = false;
      const stack: string[] = [];
      const out: string[] = [];

      for (let i = 0; i < parts.length; i++) {
        const tok = parts[i];
        if (!tok) continue;

        const isQuote = QUOTE_TOKEN_RE.test(tok);
        QUOTE_TOKEN_RE.lastIndex = 0; // reset because of /g

        if (!isQuote) {
          out.push(tok);
          continue;
        }

        // Decide opening vs closing based on state
        if (!inQuote) {
          // Opening quote

          // 1) If quote is glued to previous non-space char, add a space before it:
          //    advanced."Take  -> advanced. "Take
          if (out.length > 0) {
            const prev = out[out.length - 1];
            if (/[^\s]$/.test(prev) && !/[([{\u2014-]\s*$/.test(prev)) {
              out[out.length - 1] = prev + ' ';
            }
          }

          // 2) If the next chunk starts with spaces, trim them:
          //    . " Take -> . "Take
          if (i + 1 < parts.length && typeof parts[i + 1] === 'string') {
            parts[i + 1] = parts[i + 1].replace(/^\s+/, '');
          }

          out.push(tok);
          inQuote = true;
          stack.push(tok);
        } else {
          // Closing quote
          out.push(tok);
          inQuote = false;
          stack.pop();
        }
      }

      // If we ended "inside" a quote, decide whether to remove a stray opener
      // or add a missing closer.
      if (inQuote && stack.length) {
        const openTok = stack[stack.length - 1];

        // If the last *non-space* thing is a quote token, it's almost certainly stray: remove it.
        // e.g. ... bowing."
        for (let j = out.length - 1; j >= 0; j--) {
          if (out[j].trim() === '') continue;

          if (QUOTE_TOKEN_RE.test(out[j])) {
            // remove the stray quote token
            out.splice(j, 1);
          } else {
            // otherwise, append the missing closing quote
            out.push(closingFor(openTok));
          }
          QUOTE_TOKEN_RE.lastIndex = 0;
          break;
        }
      }

      return out.join('');
    }

    return html
      .split(/(<[^>]+>)/g) // Preserve tags intact.
      .map((segment) => {
        if (/^<[^>]+>$/.test(segment)) return segment;

        let t = segment;

        // Your existing fixes:
        t = t.replace(/([^\s])&#x201D;(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1 &#x201C;');
        t = t.replace(/(^|\s)&#x201D;(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1&#x201C;');

        t = t.replace(/([^ \t\r\n])(&#x201C;)(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1 $2');

        t = t.replace(/,(&#x201D;)/g, '$1,');
        t = t.replace(/,([\"”])/g, '$1,');
        t = t.replace(/,(&quot;)/gi, '$1,');

        t = t.replace(/([^ \t\r\n])([\"“])(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1 $2');
        t = t.replace(/([^ \t\r\n])(&quot;)(?=[A-Za-zÀ-ÖØ-öø-ÿ])/gi, '$1 $2');

        t = t.replace(/(\S)=(\S)/g, '$1 = $2');
        t = t.replace(/(\S)=\s/g, '$1 = ');
        t = t.replace(/\s=(\S)/g, ' = $1');

        // ✅ New: stateful quote correction (fixes both of your examples)
        t = fixQuotesStatefully(t);

        return t;
      })
      .join('');
  }

  return adjustSpacingAndQuotes(finalHtml);
}

export function extractChapterTitle(rawText: string): string {
  let cleanText = rawText.trim();

  // Remove zero-width characters
  cleanText = cleanText.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // If there's an em-dash / en-dash used as a separator, strip everything before the first one
  if (/[—–]/.test(cleanText)) {
    const parts = cleanText.split(/[—–]/);
    // Keep everything after the first dash, rejoining the rest with an em-dash to preserve secondary parts
    cleanText = parts.slice(1).join('—');
  } else {
    // Remove leading "Volume <number>" (and optional decimal), e.g., "Volume 4 3.5", leaving the rest
    cleanText = cleanText.replace(/^Volume\s*\d+(?:\.\d+)?\s*/i, '');
  }

  // Remove leading "Chapter" keyword
  cleanText = cleanText.replace(/^Chapter\s+/i, '');

  // Remove numeric prefixes with separators like "1 - Title" or "2: Title"
  cleanText = cleanText.replace(/^\d+\s*[-–—:]\s*/, '');

  // Remove standalone numeric prefixes like "123 Title"
  cleanText = cleanText.replace(/^\d+\s+/, '');

  // Strip everything before a colon for log-like input
  cleanText = cleanText.replace(/^.*?:\s*/, '');

  cleanText = cleanText.trim();

  // If the remaining text is only digits, return empty
  return /^\d+$/.test(cleanText) ? '' : cleanText;
}

export function insertTitleHtml(title: string, chapterNumber: number, html: string): string {
  const h4Regex = /<h4>([\s\S]*?)<\/h4>/i;

  if (h4Regex.test(html)) {
    return html.replace(h4Regex, (_match, content) => {
      const cleanedTitle = extractChapterTitle(content);
      return `<h4>Chapter ${chapterNumber} ${cleanedTitle ? `- ${cleanedTitle}` : ''}</h4>`;
    });
  } else {
    return `<h4>Chapter ${chapterNumber} ${title ? `- ${title}` : ''}</h4>\n` + html;
  }
}

export function extractContentFromHTML(html: string): { title: string; paragraphs: string[] } {
  const dom = parseDocument(html);

  const h4 = DomUtils.getElementsByTagName('h4', dom.children)[0];
  const title = h4 ? DomUtils.getText(h4).trim() : '';

  const paragraphs = DomUtils.getElementsByTagName('p', dom.children);
  const paragraphTexts = paragraphs.map((p) => DomUtils.getText(p).trim()).filter(Boolean);

  return {
    title,
    paragraphs: paragraphTexts,
  };
}
