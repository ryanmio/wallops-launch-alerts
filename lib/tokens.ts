// Generate a secure confirmation token
export async function generateConfirmationToken(email: string): Promise<string> {
  const timestamp = Date.now().toString()
  const randomArray = new Uint8Array(16)
  crypto.getRandomValues(randomArray)
  const random = Array.from(randomArray, (byte) => byte.toString(16).padStart(2, "0")).join("")
  const payload = `${email}:${timestamp}:${random}`

  // Create hash with secret key
  const secret = process.env.TOKEN_SECRET || "fallback-secret-key"
  const encoder = new TextEncoder()
  const data = encoder.encode(payload + secret)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hash = Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("")

  const token = btoa(`${payload}:${hash}`)
  return token
}

// Verify and decode confirmation token
export async function verifyConfirmationToken(
  token: string,
  email: string,
): Promise<{ valid: boolean; expired?: boolean }> {
  try {
    const decoded = atob(token)
    const parts = decoded.split(":")

    if (parts.length !== 4) {
      return { valid: false }
    }

    const [tokenEmail, timestamp, random, hash] = parts

    // Check if email matches
    if (tokenEmail !== email) {
      return { valid: false }
    }

    // Check if token is expired (24 hours)
    const tokenTime = Number.parseInt(timestamp)
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    if (now - tokenTime > maxAge) {
      return { valid: false, expired: true }
    }

    // Verify hash
    const secret = process.env.TOKEN_SECRET || "fallback-secret-key"
    const payload = `${tokenEmail}:${timestamp}:${random}`
    const encoder = new TextEncoder()
    const data = encoder.encode(payload + secret)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const expectedHash = Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("")

    if (hash !== expectedHash) {
      return { valid: false }
    }

    return { valid: true }
  } catch (error) {
    console.error("[v0] Error verifying token:", error)
    return { valid: false }
  }
}

// Generate unsubscribe token (simpler, longer-lived)
export async function generateUnsubscribeToken(email: string): Promise<string> {
  const secret = process.env.TOKEN_SECRET || "fallback-secret-key"
  const encoder = new TextEncoder()
  const data = encoder.encode(email + secret)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hash = Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("")

  return btoa(`${email}:${hash}`)
}

// Verify unsubscribe token
export async function verifyUnsubscribeToken(token: string): Promise<{ valid: boolean; email?: string }> {
  try {
    const decoded = atob(token)
    const parts = decoded.split(":")

    if (parts.length !== 2) {
      return { valid: false }
    }

    const [email, hash] = parts

    // Verify hash
    const secret = process.env.TOKEN_SECRET || "fallback-secret-key"
    const encoder = new TextEncoder()
    const data = encoder.encode(email + secret)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const expectedHash = Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("")

    if (hash !== expectedHash) {
      return { valid: false }
    }

    return { valid: true, email }
  } catch (error) {
    console.error("[v0] Error verifying unsubscribe token:", error)
    return { valid: false }
  }
}
