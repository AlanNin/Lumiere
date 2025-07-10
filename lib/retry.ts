export async function tryAndReTryNovelInfo<T>(
  novelSlug: string,
  tryFunction: (novelSlug: string) => Promise<T | null>
): Promise<T> {
  const errors: string[] = [];

  try {
    const result = await tryFunction(novelSlug);
    if (result !== null) return result;
    errors.push(`First attempt (${novelSlug}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`First attempt (${novelSlug}) failed: ${error.message}`);
    } else {
      errors.push(`First attempt (${novelSlug}) failed: Unknown Error`);
    }
  }

  const fallbackNovelSlug = `${novelSlug}-novel`;
  try {
    const result = await tryFunction(fallbackNovelSlug);
    if (result !== null) return result;
    errors.push(`Second attempt (${fallbackNovelSlug}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(
        `Second attempt (${fallbackNovelSlug}) failed: ${error.message}`
      );
    } else {
      errors.push(`Second attempt (${novelSlug}) failed: Unknown Error`);
    }
  }

  throw new Error(`All retries failed:\n${errors.join("\n")}`);
}

export async function tryAndReTryNovelChapter<T>(
  chapterUrl: string,
  novelTitleSlug: string,
  chapterNumber: number,
  chapterTitleSlug: string,
  tryFunction: (chapterUrl: string, chapterNumber: number) => Promise<T | null>
): Promise<T> {
  const errors: string[] = [];

  try {
    const result = await tryFunction(chapterUrl, chapterNumber);
    if (result !== null) return result;
    errors.push(`First attempt (${chapterUrl}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`First attempt (${chapterUrl}) failed: ${error.message}`);
    } else {
      errors.push(`First attempt (${chapterUrl}) failed: Unknown Error`);
    }
  }

  const firstFallbackUrl = `https://novelbin.com/b/${novelTitleSlug}/chapter-${chapterNumber}`;

  try {
    const result = await tryFunction(firstFallbackUrl, chapterNumber);
    if (result !== null) return result;
    errors.push(`Second attempt (${firstFallbackUrl}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(
        `Second attempt (${firstFallbackUrl}) failed: ${error.message}`
      );
    } else {
      errors.push(`Second attempt (${firstFallbackUrl}) failed: Unknown Error`);
    }
  }

  const secondFallbackUrl = `https://novelbin.com/b/${novelTitleSlug}-novel/chapter-${chapterNumber}`;

  try {
    const result = await tryFunction(secondFallbackUrl, chapterNumber);
    if (result !== null) return result;
    errors.push(`Second attempt (${secondFallbackUrl}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(
        `Second attempt (${secondFallbackUrl}) failed: ${error.message}`
      );
    } else {
      errors.push(
        `Second attempt (${secondFallbackUrl}) failed: Unknown Error`
      );
    }
  }

  const thirdFallbackUrl = `https://novelbin.com/b/${novelTitleSlug}/cchapter-${chapterNumber}-${chapterTitleSlug}`;

  try {
    const result = await tryFunction(thirdFallbackUrl, chapterNumber);
    if (result !== null) return result;
    errors.push(`Second attempt (${thirdFallbackUrl}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(
        `Second attempt (${thirdFallbackUrl}) failed: ${error.message}`
      );
    } else {
      errors.push(`Second attempt (${thirdFallbackUrl}) failed: Unknown Error`);
    }
  }

  throw new Error(`All retries failed:\n${errors.join("\n")}`);
}
