// ============================================================
// DApp Provider Content Script
// 注入 window.ethereum 到网页，让 DApp 能与钱包交互
// 实现 EIP-1102, EIP-3085, EIP-3326, EIP-747 等标准
// ============================================================

import type { PlasmoCSConfig } from "plasmo"
import { sendToBackground } from "@plasmohq/messaging"

// Plasmo content script 配置
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
}

// 钱包 Provider 接口
interface WalletProvider {
  isWltWallet: boolean
  selectedAddress: string | null
  chainId: string | null
  networkVersion: string | null
  isConnected: () => boolean
  request: (request: { method: string; params?: any[] }) => Promise<any>
  on: (event: string, handler: (...args: any[]) => void) => void
  removeListener: (event: string, handler: (...args: any[]) => void) => void
  emit: (event: string, ...args: any[]) => void
}

class WltWalletProvider implements WalletProvider {
  public isWltWallet = true
  public selectedAddress: string | null = null
  public chainId: string | null = null
  public networkVersion: string | null = null

  private eventListeners: Map<string, Function[]> = new Map()
  private _isConnected = false
  private _requestId = 0

  constructor() {
    this.init()
  }

  private async init() {
    try {
      // 检查钱包是否已解锁
      const response = await sendToBackground({
        name: "check-lock",
        body: {},
      })

      if (!response.locked) {
        // 钱包已解锁，获取账户和网络信息
        const accountsResponse = await sendToBackground({
          name: "get-accounts",
          body: {},
        })

        if (accountsResponse.accounts?.length > 0) {
          this.selectedAddress = accountsResponse.accounts[0].address
          this._isConnected = true
        }

        const chainResponse = await sendToBackground({
          name: "get-chain-id",
          body: {},
        })

        if (chainResponse.chainId) {
          this.chainId = `0x${chainResponse.chainId.toString(16)}`
          this.networkVersion = chainResponse.chainId.toString()
        }
      }
    } catch (error) {
      console.error("[WLT Wallet] Init error:", error)
    }
  }

  isConnected(): boolean {
    return this._isConnected && this.selectedAddress !== null
  }

  async request(request: { method: string; params?: any[] }): Promise<any> {
    const { method, params = [] } = request

    switch (method) {
      case "eth_requestAccounts":
        return this.handleRequestAccounts()

      case "eth_accounts":
        return this.selectedAddress ? [this.selectedAddress] : []

      case "eth_chainId":
        return this.chainId

      case "net_version":
        return this.networkVersion

      case "wallet_watchAsset":
        return this.handleWatchAsset(params[0])

      case "wallet_addEthereumChain":
        return this.handleAddEthereumChain(params[0])

      case "wallet_switchEthereumChain":
        return this.handleSwitchEthereumChain(params[0])

      case "eth_sendTransaction":
        return this.handleSendTransaction(params[0])

      case "personal_sign":
      case "eth_sign":
        return this.handleSign(method, params)

      case "eth_signTypedData":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4":
        return this.handleSignTypedData(method, params)

      default:
        // 转发到 background 处理
        return this.forwardToBackground(method, params)
    }
  }

  private async handleRequestAccounts(): Promise<string[]> {
    const response = await sendToBackground({
      name: "dapp-request-accounts",
      body: {},
    })

    if (response.accounts?.length > 0) {
      this.selectedAddress = response.accounts[0]
      this._isConnected = true
      this.emit("accountsChanged", [this.selectedAddress])
      return response.accounts
    }

    throw new Error("用户拒绝连接")
  }

  private async handleWatchAsset(params: any): Promise<boolean> {
    const response = await sendToBackground({
      name: "dapp-watch-asset",
      body: { params },
    })
    return response.success
  }

  private async handleAddEthereumChain(params: any): Promise<null> {
    const response = await sendToBackground({
      name: "dapp-add-chain",
      body: { params },
    })

    if (response.success) {
      return null
    }

    throw new Error(response.error || "添加网络失败")
  }

  private async handleSwitchEthereumChain(params: any): Promise<null> {
    const response = await sendToBackground({
      name: "dapp-switch-chain",
      body: { params },
    })

    if (response.success) {
      this.chainId = params.chainId
      this.networkVersion = parseInt(params.chainId, 16).toString()
      this.emit("chainChanged", params.chainId)
      return null
    }

    throw new Error(response.error || "切换网络失败")
  }

  private async handleSendTransaction(params: any): Promise<string> {
    const response = await sendToBackground({
      name: "dapp-send-transaction",
      body: { params },
    })

    if (response.txHash) {
      return response.txHash
    }

    throw new Error(response.error || "交易失败")
  }

  private async handleSign(method: string, params: any[]): Promise<string> {
    const response = await sendToBackground({
      name: "dapp-sign",
      body: { method, params },
    })

    if (response.signature) {
      return response.signature
    }

    throw new Error(response.error || "签名失败")
  }

  private async handleSignTypedData(
    method: string,
    params: any[]
  ): Promise<string> {
    const response = await sendToBackground({
      name: "dapp-sign-typed-data",
      body: { method, params },
    })

    if (response.signature) {
      return response.signature
    }

    throw new Error(response.error || "签名失败")
  }

  private async forwardToBackground(
    method: string,
    params: any[]
  ): Promise<any> {
    const response = await sendToBackground({
      name: "dapp-forward",
      body: { method, params },
    })

    if (response.error) {
      throw new Error(response.error)
    }

    return response.result
  }

  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(handler)
  }

  removeListener(event: string, handler: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(handler)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(...args)
        } catch (error) {
          console.error(`[WLT Wallet] Event listener error (${event}):`, error)
        }
      })
    }
  }
}

// 注入 Provider
function injectProvider() {
  const provider = new WltWalletProvider()

  // 注入到 window.ethereum（兼容 MetaMask）
  Object.defineProperty(window, "ethereum", {
    value: provider,
    writable: false,
    configurable: true,
  })

  // 注入到 window.wlt（自定义标识）
  Object.defineProperty(window, "wlt", {
    value: provider,
    writable: false,
    configurable: true,
  })

  // 触发 Provider 初始化事件（EIP-6963）
  window.dispatchEvent(new Event("ethereum#initialized"))

  console.log("[WLT Wallet] Provider injected")
}

// 在文档加载前注入
if (typeof window !== "undefined") {
  injectProvider()
}
