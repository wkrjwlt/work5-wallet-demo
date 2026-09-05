import type { PlasmoMessaging } from "@plasmohq/messaging"
import { loadVault, unlockVault } from "~lib/vault"
import { derivePrivateKeyFromMnemonic } from "~lib/keyring"
import { getCachedSecret } from "./unlock-wallet"
import { STORAGE_KEYS } from "~lib/constants"
import type { Account } from "~store/types"

// 导出私钥：需要密码验证，返回当前账户的私钥
const handler: PlasmoMessaging.MessageHandler<
  { password: string },
  { success: boolean; privateKey?: string; error?: string }
> = async (req, res) => {
  try {
    const { password } = req.body

    if (!password) {
      res.send({ success: false, error: "请输入密码" })
      return
    }

    // 验证密码：通过解密 vault 来确认
    const vault = await loadVault()
    if (!vault) {
      res.send({ success: false, error: "未找到钱包" })
      return
    }

    // 优先使用缓存的密钥（钱包已解锁时），避免重新解密
    let secret: string
    const cached = getCachedSecret()
    if (cached) {
      console.log("[export-private-key] Using cached secret")
      secret = cached
    } else {
      console.log("[export-private-key] Decrypting vault...")
      try {
        secret = await unlockVault(vault, password)
      } catch {
        res.send({ success: false, error: "密码错误" })
        return
      }
    }

    // 获取当前活跃账户
    const accountsResult = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS)
    const accounts: Account[] = accountsResult[STORAGE_KEYS.ACCOUNTS] || []
    const activeIndexResult = await chrome.storage.local.get("wlt:active-account-index")
    const activeIndex = activeIndexResult["wlt:active-account-index"] || 0
    const account = accounts[activeIndex]

    if (!account) {
      res.send({ success: false, error: "未找到账户" })
      return
    }

    let privateKey: string
    if (vault.vaultType === "hd") {
      // HD 钱包：从助记词派生私钥
      privateKey = derivePrivateKeyFromMnemonic(secret, account.index)
    } else {
      // 导入的钱包：secret 就是私钥
      privateKey = secret
    }

    res.send({ success: true, privateKey })
  } catch (error) {
    console.error("export-private-key error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
