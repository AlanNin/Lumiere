export async function tryAndReTry<T>(
  slug: string,
  tryFunction: (slug: string) => Promise<T | null>
): Promise<T> {
  const errors: string[] = [];

  try {
    const result = await tryFunction(slug);
    if (result !== null) return result;
    errors.push(`First attempt (${slug}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`First attempt (${slug}) failed: ${error.message}`);
    } else {
      errors.push(`First attempt (${slug}) failed: Unknown Error`);
    }
  }

  const fallbackSlug = `${slug}-novel`;
  try {
    const result = await tryFunction(fallbackSlug);
    if (result !== null) return result;
    errors.push(`Second attempt (${fallbackSlug}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Second attempt (${fallbackSlug}) failed: ${error.message}`);
    } else {
      errors.push(`Second attempt (${slug}) failed: Unknown Error`);
    }
  }

  throw new Error(`All retries failed:\n${errors.join("\n")}`);
}
