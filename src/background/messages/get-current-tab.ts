import type { PlasmoMessaging } from "@plasmohq/messaging"

// 获取当前活动标签页的 tabId
// 用于 content script 通过 background 向 MAIN world 注入代码
const handler: PlasmoMessaging.MessageHandler = async (_req, res) => {
  try {
    console.log("[WLT get-current-tab] called")
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    console.log("[WLT get-current-tab] tab:", tab?.id, tab?.url)
    if (tab?.id) {
      res.send({ tabId: tab.id })
    } else {
      console.warn("[WLT get-current-tab] No active tab found")
      res.send({ error: "No active tab found" })
    }
  } catch (error: any) {
    console.error("[WLT Wallet] get-current-tab error:", error)
    res.send({ error: error.message })
  }
}

export default handler
