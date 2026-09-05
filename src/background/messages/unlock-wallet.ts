import type { PlasmoMessaging } from "@plasmohq/messaging"

import { loadVault, unlockVault } from "~lib/vault"
import type { UnlockRequest, UnlockResponse } from "~store/types"

// 密码尝试限制（防暴力破解）
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 分钟
let attemptCount = 0
let lockoutUntil = 0

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

    // 检查是否处于锁定状态
    if (Date.now() < lockoutUntil) {
      const remainingMin = Math.ceil((lockoutUntil - Date.now()) / 60000)
      res.send({ success: false, error: `密码尝试过于频繁，请在 ${remainingMin} 分钟后重试` })
      return
    }

    const vault = await loadVault()
    if (!vault) {
      res.send({ success: false, error: "未找到钱包" })
      return
    }

    // Try to decrypt - wrong password will throw
    const secret = await unlockVault(vault, password)

    // 解锁成功：重置尝试计数
    attemptCount = 0
    lockoutUntil = 0

    // Cache the secret in memory
    cachedSecret = secret

    res.send({ success: true })
  } catch (error) {
    console.error("unlock-wallet error:", error)

    // 解锁失败：增加尝试计数
    attemptCount++
    if (attemptCount >= MAX_ATTEMPTS) {
      lockoutUntil = Date.now() + LOCKOUT_DURATION_MS
      res.send({ success: false, error: `密码错误，已锁定 5 分钟（连续错误 ${MAX_ATTEMPTS} 次）` })
    } else {
      res.send({ success: false, error: `密码错误（剩余 ${MAX_ATTEMPTS - attemptCount} 次尝试机会）` })
    }
  }
}

export default handler
