// ============================================================
// AES-256-GCM encryption, SHA-256 hashing, PBKDF2 key derivation
// Uses Web Crypto API (available in both popup and service worker)
// ============================================================

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// ============================================================
// SHA-256 Hashing
// ============================================================

export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
  return toHex(hashBuffer)
}

// ============================================================
// PBKDF2 Key Derivation
// ============================================================

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 600000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

// ============================================================
// AES-256-GCM Encryption / Decryption
// ============================================================

export interface EncryptedResult {
  cipherText: string // Base64
  iv: string // Base64
  salt: string // Base64
}

export async function encrypt(
  plaintext: string,
  password: string
): Promise<EncryptedResult> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const key = await deriveKey(password, salt)
  const encoder = new TextEncoder()
  const plaintextBuffer = encoder.encode(plaintext)

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextBuffer
  )

  return {
    cipherText: toBase64(cipherBuffer),
    iv: toBase64(iv.buffer),
    salt: toBase64(salt.buffer),
  }
}

export async function decrypt(
  cipherText: string,
  iv: string,
  salt: string,
  password: string
): Promise<string> {
  const saltBuffer = fromBase64(salt)
  const ivBuffer = fromBase64(iv)
  const cipherBuffer = fromBase64(cipherText)

  const key = await deriveKey(password, saltBuffer)

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    key,
    cipherBuffer
  )

  const decoder = new TextDecoder()
  return decoder.decode(plainBuffer)
}
