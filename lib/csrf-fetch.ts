/**
 * Fetch wrapper yang otomatis menyertakan header `x-csrf-token`
 * dari cookie `csrf-token`. Digunakan untuk semua POST/PATCH/PUT/DELETE
 * dari client side agar lolos validasi CSRF di middleware.
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

export async function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase()
  const isStateChanging =
    method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE"

  if (!isStateChanging) {
    return fetch(input, init)
  }

  const csrfToken = getCookie("csrf-token")
  const headers = new Headers(init?.headers)

  if (csrfToken) {
    headers.set("x-csrf-token", csrfToken)
  }

  return fetch(input, { ...init, headers })
}
