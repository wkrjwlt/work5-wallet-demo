import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import { getCachedSecret, refreshSession } from "./unlock-wallet"
import { loadVault } from "~lib/vault"
import { derivePrivateKeyFromMnemonic, signMessage } from "~lib/keyring"
import type { Account } from "~store/types"

// 处理 DApp 签名消息请求 (EIP-191 personal_sign)
const handler: PlasmoMessaging.MessageHandler<
  { method: string; params: any[] },
  { signature?: string; error?: string }
> = async (req, res) => {
  try {
    const { method, params } = req.body

    // 检查钱包是否解锁
    const secret = getCachedSecret()
    if (!secret) {
      res.send({ error: "钱包已锁定" })
      return
    }

    // 获取账户
    const accountsResult = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS)
    const accounts: Account[] = accountsResult[STORAGE_KEYS.ACCOUNTS] || []

    let address: string
    let message: string

    if (method === "personal_sign") {
      // personal_sign: [message, address]
      message = params[0]
      address = params[1]
    } else if (method === "eth_sign") {
      // eth_sign: [address, message]
      address = params[0]
      message = params[1]
    } else {
      res.send({ error: "不支持的签名方法" })
      return
    }

    const account = accounts.find(
      (a) => a.address.toLowerCase() === address.toLowerCase()
    )

    if (!account) {
      res.send({ error: "未找到账户" })
      return
    }

    // 获取私钥
    const vault = await loadVault()
    let privateKey: string
    if (vault.vaultType === "hd") {
      privateKey = derivePrivateKeyFromMnemonic(secret, account.index)
    } else {
      privateKey = secret
    }

    // 签名消息
    const signature = await signMessage(privateKey, message)

    // 刷新会话
    refreshSession()

    res.send({ signature })
  } catch (error) {
    console.error("dapp-sign error:", error)
    res.send({ error: (error as Error).message })
  }
}

export default handler
