import type { PlasmoMessaging } from "@plasmohq/messaging"

import { loadVault, unlockVault } from "~lib/vault"
import type { UnlockRequest, UnlockResponse } from "~store/types"

// In-memory cache for the decrypted secret (mnemonic or private key)
// This is ONLY in the service worker's global scope
let cachedSecret: string | null = null

export function getCachedSecret(): string | null {
  return cachedSecret
}

export function setCachedSecret(secret: string): void {
  cachedSecret = secret
}

export function clearCachedSecret(): void {
  cachedSecret = null
}

export function refreshSession(): void {
  // No-op: auto-lock disabled
}

const handler: PlasmoMessaging.MessageHandler<
  UnlockRequest,
  UnlockResponse
> = async (req, res) => {
  try {
    const { password } = req.body

    if (!password) {
      res.send({ success: false, error: "请输入密码" })
      return
    }

    const vault = await loadVault()
    if (!vault) {
      res.send({ success: false, error: "未找到钱包" })
      return
    }

    // Try to decrypt - wrong password will throw
    const secret = await unlockVault(vault, password)

    // Cache the secret in memory
    cachedSecret = secret

    res.send({ success: true })
  } catch (error) {
    console.error("unlock-wallet error:", error)
    res.send({ success: false, error: "密码错误" })
  }
}

export default handler
