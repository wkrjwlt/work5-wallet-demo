import type { PlasmoMessaging } from "@plasmohq/messaging"
import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { getCachedSecret } from "./unlock-wallet"
import type { Network } from "~store/types"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { account, message, method, origin, favicon, requestId } = req.body || {}

    // 返回 pending，立即释放消息通道
    res.send({ pending: true })

    const walletLocked = !getCachedSecret()

    // 构建确认页面 URL
    const confirmUrl = chrome.runtime.getURL("tabs/sign-message.html")
    const urlParams = new URLSearchParams({
      origin: origin || "",
      favicon: favicon || "",
      account: account || "",
      message: message || "",
      method: method || "personal_sign",
      locked: walletLocked ? "true" : "false",
      requestId: requestId || "",
    })
    const fullUrl = `${confirmUrl}?${urlParams.toString()}`

    // 打开确认弹窗
    await chrome.windows.create({
      url: fullUrl,
      type: "popup",
      width: 420,
      height: walletLocked ? 620 : 540,
    })
  } catch (error) {
    console.error("show-sign-confirm error:", error)
    res.send({ error: (error as Error).message })
  }
}

export default handler
