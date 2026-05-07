/**
 * Parse a fetch Response as JSON. Next.js and some proxies return HTML bodies
 * (e.g. "Internal Server Error") on 500s, which makes `res.json()` throw SyntaxError.
 */
export async function parseApiBody(res: Response, context: string): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text?.trim()) {
    return { error: `${context} (empty response, status ${res.status}).` };
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { error: `${context} (response was not a JSON object).` };
  } catch {
    const head = text.slice(0, 120).trim().replace(/\s+/g, ' ');
    const looksInternal = /internal server error/i.test(text.slice(0, 400));
    return {
      error: looksInternal
        ? `${context} The server crashed or returned an HTML error page — open your host logs (e.g. Vercel → Functions) for the failing /api route. Common causes: database connection, missing Prisma migration, or unhandled exception.`
        : `${context} Unexpected response (${res.status}): ${head}`,
    };
  }
}
