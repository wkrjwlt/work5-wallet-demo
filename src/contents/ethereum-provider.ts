// ============================================================
// DApp Provider Content Script
// 通过 background 注入 window.wltwallet 到页面
// 通信方式：MAIN world → postMessage → content script → background → chrome.scripting → MAIN world
// ============================================================

import type { PlasmoCSConfig } from "plasmo"

// Plasmo content script 配置
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
}

// 唯一标识，防止与其他扩展冲突
const WLT_CHANNEL = "wlt-wallet-provider"

// 显示授权弹窗，等待用户确认
// 使用 storage 事件 + 轮询双重机制确保接收结果
function showApprovalPopup(addresses: string[]): Promise<boolean> {
  console.log("[WLT Wallet] showApprovalPopup called with:", addresses)
  return new Promise(async (resolve) => {
    let resolved = false
    const doResolve = (value: boolean) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      clearInterval(pollInterval)
      chrome.storage.onChanged.removeListener(onStorageChange)
      chrome.storage.local.remove(storageKey)
      console.log("[WLT Wallet] Approval resolved:", value)
      resolve(value)
    }

    // 生成唯一请求 ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const storageKey = `wlt_approval_${requestId}`

    // 获取 DApp 的 origin 和 favicon
    const origin = window.location.origin
    const faviconEl = document.querySelector('link[rel*="icon"]') as HTMLLinkElement
    const favicon = faviconEl?.href || ""

    // 机制1: 监听 storage 变化（实时，优先）
    const onStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[storageKey]) {
        const { newValue } = changes[storageKey]
        console.log("[WLT Wallet] Approval result from storage event:", newValue)
        doResolve(newValue?.approved ?? true)
      }
    }
    chrome.storage.onChanged.addListener(onStorageChange)

    // 机制2: 轮询 storage（备用，防止 storage 事件不触发）
    const pollInterval = setInterval(async () => {
      try {
        const result = await chrome.storage.local.get(storageKey)
        if (result[storageKey]) {
          console.log("[WLT Wallet] Approval result from polling:", result[storageKey])
          doResolve(result[storageKey].approved ?? true)
        }
      } catch (e) {
        // 忽略轮询错误
      }
    }, 500)

    // 超时 120 秒自动拒绝
    const timeout = setTimeout(() => {
      doResolve(false)
    }, 120000)

    try {
      // 发送请求到 background（立即返回，不等待弹窗结果）
      const response = await chrome.runtime.sendMessage({
        name: "show-approval-popup",
        body: { addresses, origin, favicon, requestId },
      })
      console.log("[WLT Wallet] Approval request sent:", response)

      // 如果 background 立即返回了结果（如没有地址），直接处理
      if (response?.approved !== undefined) {
        doResolve(response.approved)
      }
    } catch (e) {
      console.error("[WLT Wallet] Failed to show approval popup:", e)
      doResolve(true) // 弹窗失败时默认允许
    }
  })
}

// 显示交易确认弹窗，等待用户确认
// 使用与 showApprovalPopup 相同的 storage 事件 + 轮询机制
function showTransactionConfirm(txParams: any): Promise<boolean> {
  console.log("[WLT Wallet] showTransactionConfirm called with:", txParams)
  return new Promise(async (resolve) => {
    let resolved = false
    const doResolve = (value: boolean) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      clearInterval(pollInterval)
      chrome.storage.onChanged.removeListener(onStorageChange)
      chrome.storage.local.remove(storageKey)
      console.log("[WLT Wallet] Transaction confirm resolved:", value)
      resolve(value)
    }

    const requestId = `req_tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const storageKey = `wlt_approval_${requestId}`

    const origin = window.location.origin
    const faviconEl = document.querySelector('link[rel*="icon"]') as HTMLLinkElement
    const favicon = faviconEl?.href || ""

    // 机制1: 监听 storage 变化
    const onStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[storageKey]) {
        const { newValue } = changes[storageKey]
        doResolve(newValue?.approved ?? false)
      }
    }
    chrome.storage.onChanged.addListener(onStorageChange)

    // 机制2: 轮询 storage
    const pollInterval = setInterval(async () => {
      try {
        const result = await chrome.storage.local.get(storageKey)
        if (result[storageKey]) {
          doResolve(result[storageKey].approved ?? false)
        }
      } catch (e) {}
    }, 500)

    // 超时 180 秒自动拒绝
    const timeout = setTimeout(() => {
      doResolve(false)
    }, 180000)

    try {
      // 确保 value 是 hex 字符串（viem/wagmi 可能传 bigint）
      let valueHex = "0x0"
      if (txParams.value !== undefined && txParams.value !== null) {
        if (typeof txParams.value === "bigint") {
          valueHex = "0x" + txParams.value.toString(16)
        } else {
          valueHex = typeof txParams.value === "string" ? txParams.value : String(txParams.value)
        }
      }
      console.log("[WLT Wallet] txParams.value:", txParams.value, "→ valueHex:", valueHex)

      const response = await chrome.runtime.sendMessage({
        name: "show-transaction-confirm",
        body: {
          from: txParams.from,
          to: txParams.to,
          value: valueHex,
          data: txParams.data,
          origin,
          favicon,
          requestId,
        },
      })
      if (response?.approved !== undefined) {
        doResolve(response.approved)
      }
    } catch (e) {
      console.error("[WLT Wallet] Failed to show transaction confirm:", e)
      doResolve(false)
    }
  })
}

// 通过 background 注入 provider 到页面
async function injectProvider() {
  try {
    const response = await chrome.runtime.sendMessage({
      name: "get-current-tab",
      body: {},
    })

    if (response?.tabId) {
      await chrome.runtime.sendMessage({
        name: "inject-wallet-provider",
        body: { tabId: response.tabId },
      })
      console.log("[WLT Wallet] Provider injection requested")
    }
  } catch (error) {
    console.error("[WLT Wallet] Failed to inject provider:", error)
  }
}

// 监听注入脚本发来的请求（MAIN world → isolated world 通过 postMessage）
window.addEventListener("message", async (event) => {
  // 只处理我们的 channel
  if (event.data?.channel !== WLT_CHANNEL) return

  const { id, method, params } = event.data

  // 过滤掉没有 method 的消息（响应消息不需要处理）
  if (!method) return

  console.log("[WLT Wallet] Received request:", method, params)

  try {
    let response: any

    // 根据方法名调用对应的 background 处理器
    switch (method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        response = await chrome.runtime.sendMessage({
          name: "get-accounts",
          body: {},
        })
        // 统一返回格式
        if (response.accounts) {
          const addresses = Array.isArray(response.accounts)
            ? response.accounts.map((a: any) => typeof a === "string" ? a : a.address)
            : []
          // 如果是 eth_requestAccounts 且没有账户，返回错误提示
          if (method === "eth_requestAccounts" && addresses.length === 0) {
            response = { error: "请先在 WLT 钱包中创建或导入钱包" }
          } else if (method === "eth_requestAccounts" && addresses.length > 0) {
            // eth_requestAccounts 需要用户授权弹窗
            const approved = await showApprovalPopup(addresses)
            if (!approved) {
              response = { error: "用户拒绝了连接请求" }
            } else {
              response = { accounts: addresses }
            }
          } else {
            response = { accounts: addresses }
          }
        }
        break

      case "eth_chainId":
        response = await chrome.runtime.sendMessage({
          name: "get-chain-id",
          body: {},
        })
        break

      case "net_version":
        response = await chrome.runtime.sendMessage({
          name: "get-chain-id",
          body: {},
        })
        // net_version 返回字符串格式的 chainId
        if (response.chainId) {
          response = { result: response.chainId.toString() }
        }
        break

      case "wallet_switchEthereumChain":
        response = await chrome.runtime.sendMessage({
          name: "dapp-switch-chain",
          body: { params },
        })
        break

      case "wallet_addEthereumChain":
        response = await chrome.runtime.sendMessage({
          name: "dapp-add-chain",
          body: { params },
        })
        break

      case "wallet_watchAsset":
        response = await chrome.runtime.sendMessage({
          name: "dapp-watch-asset",
          body: { params },
        })
        break

      case "eth_sendTransaction": {
        // 先弹出交易确认窗口（类似 MetaMask 的确认弹窗）
        const txParams = params?.[0] || {}
        const txConfirmed = await showTransactionConfirm(txParams)
        if (!txConfirmed) {
          response = { error: "用户拒绝了交易" }
        } else {
          response = await chrome.runtime.sendMessage({
            name: "dapp-send-transaction",
            body: { params },
          })
        }
        break
      }

      case "personal_sign":
      case "eth_sign":
        response = await chrome.runtime.sendMessage({
          name: "dapp-sign",
          body: { method, params },
        })
        break

      case "eth_signTypedData":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4":
        response = await chrome.runtime.sendMessage({
          name: "dapp-sign-typed-data",
          body: { method, params },
        })
        break

      default:
        response = { error: `Unsupported method: ${method}` }
        break
    }

    console.log("[WLT Wallet] Response:", response)

    // 提取结果
    let result: any = null
    if (method === "eth_requestAccounts" || method === "eth_accounts") {
      result = response.accounts || []
    } else if (method === "eth_chainId") {
      result = response.chainId ? `0x${response.chainId.toString(16)}` : null
    } else if (method === "net_version") {
      result = response.result || (response.chainId ? response.chainId.toString() : null)
    } else {
      result = response.result || response.signature || response.txHash || response.success || response
    }

    console.log("[WLT Wallet] Extracted result:", result, "for method:", method)

    // 通过 background 将结果返回到 MAIN world
    // postMessage 从 isolated world 无法到达 MAIN world，所以用 chrome.scripting 代替
    const tabResponse = await chrome.runtime.sendMessage({
      name: "get-current-tab",
      body: {},
    })

    console.log("[WLT Wallet] get-current-tab response:", tabResponse)

    if (tabResponse?.tabId) {
      console.log("[WLT Wallet] Sending resolve-wlt-request, id:", id, "tabId:", tabResponse.tabId)
      await chrome.runtime.sendMessage({
        name: "resolve-wlt-request",
        body: {
          tabId: tabResponse.tabId,
          id,
          result,
          error: response.error || null,
        },
      })
      console.log("[WLT Wallet] resolve-wlt-request sent successfully")
    } else {
      console.error("[WLT Wallet] No tabId! Cannot resolve request. tabResponse:", tabResponse)
    }
  } catch (error: any) {
    console.error("[WLT Wallet] Request error:", error)

    // 错误也要通过 background 返回
    try {
      const tabResponse = await chrome.runtime.sendMessage({
        name: "get-current-tab",
        body: {},
      })

      if (tabResponse?.tabId) {
        await chrome.runtime.sendMessage({
          name: "resolve-wlt-request",
          body: {
            tabId: tabResponse.tabId,
            id,
            result: null,
            error: error.message || "Unknown error",
          },
        })
      }
    } catch (e) {
      console.error("[WLT Wallet] Failed to send error back:", e)
    }
  }
})

// 初始化
injectProvider()
