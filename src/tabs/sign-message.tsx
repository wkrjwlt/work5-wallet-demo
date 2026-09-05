import { useEffect, useState } from "react"
import "../popup.css"

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// 尝试将 hex 消息解码为 UTF-8 文本
function decodeMessage(message: string): string {
  if (!message) return ""
  // 如果是 hex 字符串，尝试解码
  if (message.startsWith("0x")) {
    try {
      const hex = message.slice(2)
      const bytes: number[] = []
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.slice(i, i + 2), 16))
      }
      const text = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes))
      // 如果解码结果是可读文本（大部分是可打印字符），返回它
      const printableRatio = text.split("").filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127).length / text.length
      if (printableRatio > 0.7) return text
    } catch {
      // 解码失败，返回原始 hex
    }
  }
  return message
}

export default function SignMessagePage() {
  const [origin, setOrigin] = useState("")
  const [favicon, setFavicon] = useState("")
  const [account, setAccount] = useState("")
  const [message, setMessage] = useState("")
  const [method, setMethod] = useState("personal_sign")
  const [walletLocked, setWalletLocked] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [loading, setLoading] = useState(true)
  const [responded, setResponded] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setOrigin(params.get("origin") || "")
    setFavicon(params.get("favicon") || "")
    setAccount(params.get("account") || "")
    setMessage(params.get("message") || "")
    setMethod(params.get("method") || "personal_sign")
    setWalletLocked(params.get("locked") === "true")
    setLoading(false)
  }, [])

  const decodedMessage = decodeMessage(message)

  const handleUnlockAndApprove = async () => {
    if (responded || !password) return
    setResponded(true)
    setUnlocking(true)
    try {
      const unlockResult = await chrome.runtime.sendMessage({
        name: "unlock-wallet",
        body: { password },
      })
      if (!unlockResult?.success) {
        setPasswordError(unlockResult?.error || "密码错误")
        setResponded(false)
        setUnlocking(false)
        return
      }
      const params = new URLSearchParams(window.location.search)
      const requestId = params.get("requestId") || ""
      await chrome.storage.local.set({ [`wlt_approval_${requestId}`]: { approved: true } })
      setTimeout(() => window.close(), 100)
    } catch (e) {
      console.error("[WLT SignConfirm] Failed:", e)
      window.close()
    }
  }

  const handleApprove = async () => {
    if (responded) return
    setResponded(true)
    try {
      const params = new URLSearchParams(window.location.search)
      const requestId = params.get("requestId") || ""
      await chrome.storage.local.set({ [`wlt_approval_${requestId}`]: { approved: true } })
      setTimeout(() => window.close(), 100)
    } catch (e) {
      window.close()
    }
  }

  const handleReject = async () => {
    if (responded) return
    setResponded(true)
    setRejected(true)
    try {
      const params = new URLSearchParams(window.location.search)
      const requestId = params.get("requestId") || ""
      await chrome.storage.local.set({ [`wlt_approval_${requestId}`]: { approved: false } })
      setTimeout(() => window.close(), 100)
    } catch (e) {
      window.close()
    }
  }

  if (loading) {
    return (
      <div className="app-container" style={{ height: "100vh" }}>
        <div className="loading"><div className="spinner" /></div>
      </div>
    )
  }

  const methodName = method === "personal_sign" ? "personal_sign" :
    method === "eth_sign" ? "eth_sign" :
    method.includes("TypedData") ? "签名结构化数据" : method

  return (
    <div className="app-container" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="header">
        <span className="header-title">WLT Wallet</span>
      </div>

      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", overflow: "auto" }}>
        {/* DApp Info */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, margin: "0 auto 8px",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>
            {favicon ? (
              <img src={favicon} alt="" style={{ width: 30, height: 30, borderRadius: 6 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
            ) : "🔗"}
          </div>
          <h2 style={{ margin: "0 0 2px", fontSize: 15, color: "#1a1a2e" }}>签名请求</h2>
          <p style={{ margin: 0, fontSize: 11, color: "#666", wordBreak: "break-all" }}>{origin}</p>
        </div>

        {/* 签名类型 */}
        <div style={{
          background: "#f0f0ff", borderRadius: 12, padding: "12px 14px", marginBottom: 12,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>{methodName}</div>
          <div style={{ fontSize: 13, color: "#333" }}>
            账户: {shortenAddress(account)}
          </div>
        </div>

        {/* 消息内容 */}
        <div style={{
          background: "#f8f9fa", borderRadius: 12, padding: 14, marginBottom: 12,
        }}>
          <div style={{
            fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
          }}>
            消息内容
          </div>
          <div style={{
            fontSize: 13, color: "#333", fontFamily: "monospace",
            background: "#fff", padding: 10, borderRadius: 8,
            wordBreak: "break-all", lineHeight: 1.5,
            maxHeight: 120, overflow: "auto",
          }}>
            {decodedMessage}
          </div>
        </div>

        {/* 安全提示 */}
        <div style={{
          background: "#fff3cd", borderRadius: 10, padding: 12, marginBottom: 12,
          fontSize: 12, color: "#856404",
        }}>
          ⚠️ 请确认您理解此签名请求。签名可以证明您拥有此账户，但不会转移资产。
        </div>

        {/* Password input (if locked) */}
        {walletLocked && (
          <div style={{ background: "#fff3cd", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#856404", marginBottom: 8, fontWeight: 600 }}>
              🔒 钱包已锁定，请输入密码解锁
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError("") }}
              placeholder="输入钱包密码"
              disabled={responded}
              style={{
                width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8,
                fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleUnlockAndApprove() }}
            />
            {passwordError && (
              <div style={{ color: "#dc3545", fontSize: 12, marginTop: 6 }}>{passwordError}</div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: "auto", display: "flex", gap: 12, paddingTop: 8 }}>
          <button
            onClick={handleReject}
            disabled={responded}
            style={{
              flex: 1, padding: "14px 0", border: "1.5px solid #e0e0e0", borderRadius: 12,
              background: "#fff", color: "#666", fontSize: 15, fontWeight: 600,
              cursor: responded ? "not-allowed" : "pointer", opacity: responded ? 0.5 : 1,
            }}
          >
            拒绝
          </button>
          <button
            onClick={walletLocked ? handleUnlockAndApprove : handleApprove}
            disabled={responded || (walletLocked && !password)}
            style={{
              flex: 1, padding: "14px 0", border: "none", borderRadius: 12,
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: responded || (walletLocked && !password) ? "not-allowed" : "pointer",
              opacity: responded || (walletLocked && !password) ? 0.5 : 1,
            }}
          >
            {responded
              ? (rejected ? "已拒绝" : (unlocking ? "解锁中..." : "处理中..."))
              : (walletLocked ? "解锁并签署" : "签署")
            }
          </button>
        </div>
      </div>
    </div>
  )
}
