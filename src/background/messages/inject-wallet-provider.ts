import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { tabId } = req.body || {}

    if (!tabId) {
      res.send({ error: "No tabId provided" })
      return
    }

    console.log("[WLT Wallet] Injecting into tab:", tabId)

    // 直接在 MAIN world 执行代码
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: "MAIN",
      func: () => {
        // 防止重复注入
        if ((window as any).wltwallet) {
          console.log("[WLT Wallet] Already injected");
          return true;
        }

        const WLT_CHANNEL = "wlt-wallet-provider";
        let requestId = 0;
        const pendingRequests = new Map();

        // 监听来自 content script 的响应（通过 window.postMessage 转发）
        // 验证消息格式：必须有 channel、id、且包含 result 或 error（不含 method 的才是响应）
        window.addEventListener("message", (event) => {
          if (event.source !== window) return;
          const data = event.data;
          if (!data || data.channel !== WLT_CHANNEL) return;
          if (data.method) return; // 这是请求消息，不是响应
          if (data.id === undefined) return;

          const pending = pendingRequests.get(data.id);
          if (pending) {
            pendingRequests.delete(data.id);
            if (data.error) {
              pending.reject(new Error(data.error));
            } else {
              pending.resolve(data.result);
            }
          }
        });

        // 发送请求到内容脚本（通过 postMessage，MAIN → isolated 可以工作）
        function sendRequest(method, params) {
          return new Promise((resolve, reject) => {
            const id = ++requestId;
            pendingRequests.set(id, { resolve, reject });
            window.postMessage({
              channel: WLT_CHANNEL,
              id,
              method,
              params,
            });
          });
        }

        // WLT Wallet Provider
        class WltWalletProvider {
          constructor() {
            this.isWltWallet = true;
            this.selectedAddress = null;
            this.chainId = null;
            this.networkVersion = null;
            this._isConnected = false;
            this._eventListeners = new Map();
          }

          isConnected() {
            return this._isConnected && this.selectedAddress !== null;
          }

          async request({ method, params = [] }) {
            switch (method) {
              case "eth_requestAccounts": {
                const accounts = await sendRequest("eth_requestAccounts", []);
                if (accounts && accounts.length > 0) {
                  this.selectedAddress = accounts[0];
                  this._isConnected = true;
                  this._emit("accountsChanged", [this.selectedAddress]);
                }
                return accounts;
              }
              case "eth_accounts": {
                const accounts = await sendRequest("eth_accounts", []);
                if (accounts && accounts.length > 0) {
                  this.selectedAddress = accounts[0];
                  this._isConnected = true;
                }
                return accounts;
              }
              case "eth_chainId": {
                const chainId = await sendRequest("eth_chainId", []);
                this.chainId = chainId;
                return chainId;
              }
              case "net_version": {
                const version = await sendRequest("net_version", []);
                this.networkVersion = version;
                return version;
              }
              case "wallet_switchEthereumChain": {
                const result = await sendRequest("wallet_switchEthereumChain", params);
                if (params[0]?.chainId) {
                  this.chainId = params[0].chainId;
                  this.networkVersion = parseInt(params[0].chainId, 16).toString();
                  this._emit("chainChanged", params[0].chainId);
                }
                return result;
              }
              case "wallet_addEthereumChain":
                return sendRequest("wallet_addEthereumChain", params);
              case "wallet_watchAsset":
                return sendRequest("wallet_watchAsset", params);
              case "eth_sendTransaction":
                return sendRequest("eth_sendTransaction", params);
              case "personal_sign":
              case "eth_sign":
                return sendRequest(method, params);
              case "eth_signTypedData":
              case "eth_signTypedData_v3":
              case "eth_signTypedData_v4":
                return sendRequest(method, params);
              default:
                return sendRequest(method, params);
            }
          }

          on(event, handler) {
            if (!this._eventListeners.has(event)) {
              this._eventListeners.set(event, []);
            }
            this._eventListeners.get(event).push(handler);
          }

          removeListener(event, handler) {
            const listeners = this._eventListeners.get(event);
            if (listeners) {
              const index = listeners.indexOf(handler);
              if (index > -1) {
                listeners.splice(index, 1);
              }
            }
          }

          _emit(event, ...args) {
            const listeners = this._eventListeners.get(event);
            if (listeners) {
              listeners.forEach((listener) => {
                try {
                  listener(...args);
                } catch (error) {
                  console.error("[WLT Wallet] Event listener error:", error);
                }
              });
            }
          }
        }

        // 注入到页面的 window（冻结对象，防止页面脚本覆盖或删除）
        const provider = new WltWalletProvider();
        Object.defineProperty(window, "wltwallet", {
          value: provider,
          writable: false,
          configurable: false,
        });

        // 触发初始化事件
        window.dispatchEvent(new CustomEvent("wltwallet#initialized", { detail: provider }));

        console.log("[WLT Wallet] Provider injected as window.wltwallet");
        return true;
      },
    })

    console.log("[WLT Wallet] Script injection result:", results)
    res.send({ success: true })
  } catch (error: any) {
    console.error("[WLT Wallet] Background injection failed:", error)
    res.send({ error: error.message })
  }
}

export default handler
