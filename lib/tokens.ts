import { createHash, randomBytes } from "crypto"

// Generate a secure confirmation token
export async function generateConfirmationToken(email: string): Promise<string> {
  const timestamp = Date.now().toString()
  const random = randomBytes(16).toString("hex")
  const payload = `${email}:${timestamp}:${random}`

  const secret = process.env.TOKEN_SECRET || "fallback-secret-key"
  const hash = createHash("sha256").update(payload + secret).digest("hex")

  const token = Buffer.from(`${payload}:${hash}`, "utf8").toString("base64")
  return token
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

    const tokenTime = Number.parseInt(timestamp)
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    if (now - tokenTime > maxAge) {
      return { valid: false, expired: true }
    }

    const secret = process.env.TOKEN_SECRET || "fallback-secret-key"
    const payload = `${tokenEmail}:${timestamp}:${random}`
    const expectedHash = createHash("sha256").update(payload + secret).digest("hex")

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
  const expectedHash = createHash("sha256").update(email + secret).digest("hex")
  return Buffer.from(`${email}:${expectedHash}`, "utf8").toString("base64")
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

    const secret = process.env.TOKEN_SECRET || "fallback-secret-key"
    const expectedHash = createHash("sha256").update(email + secret).digest("hex")

    if (hash !== expectedHash) {
      return { valid: false }
    }

    return { valid: true, email }
  } catch (error) {
    console.error("[v0] Error verifying unsubscribe token:", error)
    return { valid: false }
  }
}
