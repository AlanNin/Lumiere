export async function tryAndReTry<T>(
  param: string,
  tryFunction: (param: string) => Promise<T | null>
): Promise<T> {
  const errors: string[] = [];

  try {
    const result = await tryFunction(param);
    if (result !== null) return result;
    errors.push(`First attempt (${param}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`First attempt (${param}) failed: ${error.message}`);
    } else {
      errors.push(`First attempt (${param}) failed: Unknown Error`);
    }
  }

  const fallbackSlug = `${param}-novel`;
  try {
    const result = await tryFunction(fallbackSlug);
    if (result !== null) return result;
    errors.push(`Second attempt (${fallbackSlug}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Second attempt (${fallbackSlug}) failed: ${error.message}`);
    } else {
      errors.push(`Second attempt (${param}) failed: Unknown Error`);
    }
  }

  throw new Error(`All retries failed:\n${errors.join("\n")}`);
}

export async function tryAndReTry2Params<T>(
  firstParam: string,
  secondParam: number,
  tryFunction: (firstParam: string, secondParam: number) => Promise<T | null>
): Promise<T> {
  const errors: string[] = [];

  try {
    const result = await tryFunction(firstParam, secondParam);
    if (result !== null) return result;
    errors.push(`First attempt (${firstParam}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`First attempt (${firstParam}) failed: ${error.message}`);
    } else {
      errors.push(`First attempt (${firstParam}) failed: Unknown Error`);
    }
  }

  const fallbackSlug = `${firstParam}-novel`;
  try {
    const result = await tryFunction(fallbackSlug, secondParam);
    if (result !== null) return result;
    errors.push(`Second attempt (${fallbackSlug}) returned null`);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Second attempt (${fallbackSlug}) failed: ${error.message}`);
    } else {
      errors.push(`Second attempt (${firstParam}) failed: Unknown Error`);
    }
  }

  throw new Error(`All retries failed:\n${errors.join("\n")}`);
}
