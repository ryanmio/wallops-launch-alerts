import { createHash, randomBytes } from "crypto"

// Generate a secure confirmation token
export function generateConfirmationToken(email: string): string {
  const timestamp = Date.now().toString()
  const random = randomBytes(16).toString("hex")
  const payload = `${email}:${timestamp}:${random}`

  // Create HMAC with secret key
  const secret = process.env.TOKEN_SECRET || "fallback-secret-key"
  const hash = createHash("sha256")
    .update(payload + secret)
    .digest("hex")

  const token = Buffer.from(`${payload}:${hash}`).toString("base64")
  return token
}

// Verify and decode confirmation token
export function verifyConfirmationToken(token: string, email: string): { valid: boolean; expired?: boolean } {
  try {
    const decoded = Buffer.from(token, "base64").toString()
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
    const expectedHash = createHash("sha256")
      .update(payload + secret)
      .digest("hex")

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
export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.TOKEN_SECRET || "fallback-secret-key"
  const hash = createHash("sha256")
    .update(email + secret)
    .digest("hex")

  return Buffer.from(`${email}:${hash}`).toString("base64")
}

// Verify unsubscribe token
export function verifyUnsubscribeToken(token: string): { valid: boolean; email?: string } {
  try {
    const decoded = Buffer.from(token, "base64").toString()
    const parts = decoded.split(":")

    if (parts.length !== 2) {
      return { valid: false }
    }

    const [email, hash] = parts

    // Verify hash
    const secret = process.env.TOKEN_SECRET || "fallback-secret-key"
    const expectedHash = createHash("sha256")
      .update(email + secret)
      .digest("hex")

    if (hash !== expectedHash) {
      return { valid: false }
    }

    return { valid: true, email }
  } catch (error) {
    console.error("[v0] Error verifying unsubscribe token:", error)
    return { valid: false }
  }
}
