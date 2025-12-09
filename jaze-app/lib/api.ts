type FetchOptions = {
  maxRetries?: number;
  retryDelayMs?: number;
  timeout?: number;
};

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeout: 10000,
};

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown, status?: number): boolean {
  // Retry on network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // Retry on specific HTTP status codes
  if (status) {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  return false;
}

async function fetchWithRetry<T>(
  url: string,
  init?: RequestInit,
  options: FetchOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const shouldRetry = isRetryableError(null, res.status) && attempt < opts.maxRetries;

        if (shouldRetry) {
          const delay = opts.retryDelayMs * Math.pow(2, attempt); // Exponential backoff
          await sleep(delay);
          continue;
        }

        throw new ApiError(
          `Erreur HTTP ${res.status}`,
          res.status,
          "HTTP_ERROR"
        );
      }

      return res.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry abort errors (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("Délai d'attente dépassé", undefined, "TIMEOUT");
      }

      // Check if we should retry
      if (isRetryableError(error) && attempt < opts.maxRetries) {
        const delay = opts.retryDelayMs * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new ApiError("Erreur inconnue", undefined, "UNKNOWN");
}

export async function fetchAlbums(options?: FetchOptions) {
  return fetchWithRetry<{ albums: unknown[]; pagination?: unknown }>(
    "/api/albums",
    undefined,
    options
  );
}

export async function fetchAlbumById(id: number, options?: FetchOptions) {
  return fetchWithRetry<unknown>(
    `/api/albums/${id}`,
    undefined,
    options
  );
}

export { ApiError, fetchWithRetry };
