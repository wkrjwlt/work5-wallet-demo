import type { PlasmoMessaging } from "@plasmohq/messaging"

// Background handler: 将响应结果传递回注入脚本
// 通过 chrome.tabs.sendMessage 发送给 content script，再由 content script 转发到 MAIN world
// 这样不需要暴露全局 __wltResolve 函数
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { id, result, error, tabId } = req.body || {}

    console.log("[WLT resolve-wlt-request] Called with:", { id, tabId, result, error })

    if (!tabId) {
      console.error("[WLT resolve-wlt-request] No tabId provided")
      res.send({ error: "No tabId provided" })
      return
    }

    if (!id && id !== 0) {
      console.error("[WLT resolve-wlt-request] No request id provided")
      res.send({ error: "No request id provided" })
      return
    }

    // 通过 chrome.tabs.sendMessage 将响应发送给 content script
    // content script 会通过 window.postMessage 转发到 MAIN world 的注入脚本
    await chrome.tabs.sendMessage(tabId, {
      name: "wlt-resolve-response",
      body: {
        id,
        result: result ?? null,
        error: error ?? null,
      },
    })

    console.log("[WLT resolve-wlt-request] Response sent to content script via tabs.sendMessage")
    res.send({ success: true })
  } catch (error: any) {
    console.error("[WLT Wallet] resolve-wlt-request failed:", error)
    res.send({ error: error.message })
  }
}

export default handler
