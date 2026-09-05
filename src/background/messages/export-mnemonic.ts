import type { PlasmoMessaging } from "@plasmohq/messaging"
import { loadVault, unlockVault } from "~lib/vault"
import { getCachedSecret } from "./unlock-wallet"

// 导出助记词：需要密码验证，仅 HD 钱包支持
const handler: PlasmoMessaging.MessageHandler<
  { password: string },
  { success: boolean; mnemonic?: string; error?: string }
> = async (req, res) => {
  try {
    const { password } = req.body
    console.log("[export-mnemonic] Called")

    if (!password) {
      res.send({ success: false, error: "请输入密码" })
      return
    }

    const vault = await loadVault()
    if (!vault) {
      res.send({ success: false, error: "未找到钱包" })
      return
    }

    if (vault.vaultType !== "hd") {
      res.send({ success: false, error: "导入的私钥钱包没有助记词" })
      return
    }

    // 优先使用缓存的密钥（钱包已解锁时）
    let secret: string
    const cached = getCachedSecret()
    if (cached) {
      console.log("[export-mnemonic] Using cached secret")
      secret = cached
    } else {
      console.log("[export-mnemonic] Decrypting vault...")
      try {
        secret = await unlockVault(vault, password)
      } catch {
        res.send({ success: false, error: "密码错误" })
        return
      }
    }

    console.log("[export-mnemonic] Success")
    res.send({ success: true, mnemonic: secret })
  } catch (error) {
    console.error("export-mnemonic error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
