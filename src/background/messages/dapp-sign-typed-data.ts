import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import { getCachedSecret, refreshSession } from "./unlock-wallet"
import { loadVault } from "~lib/vault"
import { derivePrivateKeyFromMnemonic } from "~lib/keyring"
import { Wallet } from "ethers"
import type { Account } from "~store/types"

// 处理 DApp 签名结构化数据请求 (EIP-712)
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
    let typedData: any

    if (method === "eth_signTypedData" || method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
      // eth_signTypedData_v4: [address, typedData]
      address = params[0]
      typedData = params[1]
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

    // 使用 ethers.js 签名结构化数据
    const wallet = new Wallet(privateKey)
    const signature = await wallet.signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    )

    // 刷新会话
    refreshSession()

    res.send({ signature })
  } catch (error) {
    console.error("dapp-sign-typed-data error:", error)
    res.send({ error: (error as Error).message })
  }
}

export default handler
