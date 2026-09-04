import type { PlasmoMessaging } from "@plasmo messaging"

// Background handler: 处理 DApp 连接审批请求
// 使用 storage 事件进行异步通信，避免消息通道超时
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { addresses, origin, favicon, requestId } = req.body || {}

  // 立即返回，告诉 content script 请求已收到
  // 实际审批结果通过 chrome.storage.local 传递
  res.send({ pending: true })

  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
    // 没有地址请求，直接批准
    await chrome.storage.local.set({
      [`wlt_approval_${requestId}`]: { approved: true },
    })
    return
  }

  try {
    // 构建审批页面 URL（Plasmo tabs 页面路径为 tabs/<name>.html）
    const approvalUrl = chrome.runtime.getURL("tabs/approval.html")
    const params = new URLSearchParams({
      origin: origin || "",
      favicon: favicon || "",
      addresses: addresses.join(","),
    })
    const fullUrl = `${approvalUrl}?${params.toString()}`

    console.log("[WLT approve] Opening approval window:", fullUrl)

    // 打开弹窗窗口（类似 MetaMask 的弹窗体验）
    const window = await chrome.windows.create({
      url: fullUrl,
      type: "popup",
      width: 400,
      height: 560,
      focused: true,
    })

    const popupWindowId = window.id || null
    console.log("[WLT approve] Popup window opened, id:", popupWindowId)

    // 监听审批页面发来的响应
    const listener = (message: any, _sender: any, sendResponse: any) => {
      if (message.name === "wlt-approval-user-response") {
        console.log("[WLT approve] User responded:", message.body.approved)
        // 清理
        chrome.runtime.onMessage.removeListener(listener)
        if (popupWindowId) {
          chrome.windows.remove(popupWindowId).catch(() => {})
        }
        // 将结果写入 storage，content script 会监听到
        chrome.storage.local.set({
          [`wlt_approval_${requestId}`]: { approved: message.body.approved },
        })
        sendResponse({ ok: true })
        return true
      }
    }
    chrome.runtime.onMessage.addListener(listener)

    // 超时 120 秒自动拒绝
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener)
      if (popupWindowId) {
        chrome.windows.remove(popupWindowId).catch(() => {})
      }
      chrome.storage.local.set({
        [`wlt_approval_${requestId}`]: { approved: false },
      })
    }, 120000)
  } catch (error: any) {
    console.error("[WLT approve] Error:", error)
    await chrome.storage.local.set({
      [`wlt_approval_${requestId}`]: { approved: true },
    })
  }
}

export default handler
