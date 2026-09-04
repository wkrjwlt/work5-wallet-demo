import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getCachedSecret } from "./unlock-wallet"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { from, to, value, data, origin, favicon, requestId } = req.body || {}

    // 返回 pending，立即释放消息通道
    res.send({ pending: true })

    const walletLocked = !getCachedSecret()

    // 构建确认页面 URL
    const confirmUrl = chrome.runtime.getURL("tabs/confirm-transaction.html")
    const urlParams = new URLSearchParams({
      origin: origin || "",
      favicon: favicon || "",
      from: from || "",
      to: to || "",
      value: value || "0x0",
      data: data || "0x",
      locked: walletLocked ? "true" : "false",
      requestId: requestId || "",
    })
    const fullUrl = `${confirmUrl}?${urlParams.toString()}`

    // 打开确认弹窗
    await chrome.windows.create({
      url: fullUrl,
      type: "popup",
      width: 400,
      height: walletLocked ? 620 : 520,
    })
  } catch (error) {
    console.error("show-transaction-confirm error:", error)
    res.send({ error: (error as Error).message })
  }
}

export default handler
