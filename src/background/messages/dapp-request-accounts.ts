import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import type { Account } from "~store/types"

// 处理 DApp 请求连接账户
const handler: PlasmoMessaging.MessageHandler = async (_req, res) => {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS)
    const accounts: Account[] = result[STORAGE_KEYS.ACCOUNTS] || []
    const addresses = accounts.map((a) => a.address)

    // 直接返回账户地址
    res.send({ accounts: addresses })
  } catch (error) {
    console.error("dapp-request-accounts error:", error)
    res.send({ accounts: [] })
  }
}

export default handler
