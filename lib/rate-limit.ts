const rateLimitMap = new Map<string, { count: number; expiresAt: number }>()

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 10 // Max 10 dashboard generations per hour per IP

export function checkRateLimit(ip: string): { success: boolean; limit: number; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + WINDOW_MS })
    return { success: true, limit: MAX_REQUESTS, remaining: MAX_REQUESTS - 1 }
  }

  // If the window has expired, reset it
  if (now > record.expiresAt) {
    record.count = 1
    record.expiresAt = now + WINDOW_MS
    rateLimitMap.set(ip, record)
    return { success: true, limit: MAX_REQUESTS, remaining: MAX_REQUESTS - 1 }
  }

  // If the limit is reached
  if (record.count >= MAX_REQUESTS) {
    return { success: false, limit: MAX_REQUESTS, remaining: 0 }
  }

  // Increment the request count
  record.count += 1
  rateLimitMap.set(ip, record)

  return { success: true, limit: MAX_REQUESTS, remaining: MAX_REQUESTS - record.count }
}

// Clean up expired entries every 15 minutes to prevent memory leaks in the Map
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.expiresAt) {
      rateLimitMap.delete(ip)
    }
  }
}, 15 * 60 * 1000)
