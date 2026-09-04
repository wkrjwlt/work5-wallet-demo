import type { PlasmoMessaging } from "@plasmohq/messaging"

// Background handler: 将响应结果传递回 MAIN world 的注入脚本
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

    // 使用 chrome.scripting.executeScript 在 MAIN world 中调用 __wltResolve
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: "MAIN",
      func: (requestId: number, resultData: any, errorData: string | null) => {
        const resolveFn = (window as any).__wltResolve;
        console.log("[WLT Wallet] __wltResolve exists:", typeof resolveFn)
        if (typeof resolveFn === "function") {
          resolveFn(requestId, resultData, errorData);
          console.log("[WLT Wallet] __wltResolve called with id:", requestId)
        } else {
          console.error("[WLT Wallet] __wltResolve not found on window");
        }
      },
      args: [id, result ?? null, error ?? null],
    })

    console.log("[WLT resolve-wlt-request] executeScript results:", results)
    res.send({ success: true })
  } catch (error: any) {
    console.error("[WLT Wallet] resolve-wlt-request failed:", error)
    res.send({ error: error.message })
  }
}

export default handler
