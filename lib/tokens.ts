import { createHmac, randomBytes, timingSafeEqual } from "crypto"

// No fallback: a guessable secret would let anyone forge confirm/unsubscribe links
function getTokenSecret(): string {
  const secret = process.env.TOKEN_SECRET
  if (!secret) {
    throw new Error("TOKEN_SECRET is not configured")
  }
  return secret
}

function sign(payload: string): string {
  return createHmac("sha256", getTokenSecret()).update(payload).digest("hex")
}

function signatureMatches(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload))
  const provided = Buffer.from(signature)
  return expected.length === provided.length && timingSafeEqual(expected, provided)
}

// Generate a secure confirmation token
export async function generateConfirmationToken(email: string): Promise<string> {
  const timestamp = Date.now().toString()
  const random = randomBytes(16).toString("hex")
  const payload = `${email}:${timestamp}:${random}`

  return Buffer.from(`${payload}:${sign(payload)}`, "utf8").toString("base64")
}

// Verify and decode confirmation token
export async function verifyConfirmationToken(
  token: string,
  email: string,
): Promise<{ valid: boolean; expired?: boolean }> {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8")
    const parts = decoded.split(":")

    if (parts.length !== 4) {
      return { valid: false }
    }

    const [tokenEmail, timestamp, random, hash] = parts

    if (tokenEmail !== email) {
      return { valid: false }
    }

    if (!signatureMatches(`${tokenEmail}:${timestamp}:${random}`, hash)) {
      return { valid: false }
    }

    const tokenTime = Number.parseInt(timestamp)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    if (Date.now() - tokenTime > maxAge) {
      return { valid: false, expired: true }
    }

    return { valid: true }
  } catch (error) {
    console.error("[v0] Error verifying token:", error)
    return { valid: false }
  }
}

// Generate unsubscribe token (simpler, longer-lived)
export async function generateUnsubscribeToken(email: string): Promise<string> {
  const payload = `unsubscribe:${email}`
  return Buffer.from(`${email}:${sign(payload)}`, "utf8").toString("base64")
}

// Verify unsubscribe token
export async function verifyUnsubscribeToken(token: string): Promise<{ valid: boolean; email?: string }> {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8")
    const parts = decoded.split(":")

    if (parts.length !== 2) {
      return { valid: false }
    }

    const [email, hash] = parts

    if (!signatureMatches(`unsubscribe:${email}`, hash)) {
      return { valid: false }
    }

    return { valid: true, email }
  } catch (error) {
    console.error("[v0] Error verifying unsubscribe token:", error)
    return { valid: false }
  }
}
