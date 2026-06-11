const TIMEOUT_MS = 8000

interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

function wrapFetchError(e: unknown): never {
  if (e instanceof DOMException && e.name === 'AbortError') {
    throw new Error('网络请求超时，请稍后重试')
  }
  throw new Error('网络连接失败，请检查网络后重试')
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  let json: ApiEnvelope<T> | null = null
  try {
    json = (await res.json()) as ApiEnvelope<T>
  } catch {
    // response body is not JSON
  }
  // Prefer the business message from the envelope even on HTTP error status
  if (!res.ok) {
    throw new Error(json?.message ?? `请求失败（${res.status}）`)
  }
  if (!json || json.code !== 0) {
    throw new Error(json?.message ?? '请求失败')
  }
  return json.data
}

export async function apiGet<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetchWithTimeout(path, { headers: { Accept: 'application/json' } })
  } catch (e) {
    wrapFetchError(e)
  }
  return parseEnvelope<T>(res)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetchWithTimeout(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    wrapFetchError(e)
  }
  return parseEnvelope<T>(res)
}
