import { useEffect, useState } from "react"
import "../popup.css"

function formatEth(hexValue: string): string {
  try {
    const wei = BigInt(hexValue || "0x0")
    const eth = Number(wei) / 1e18
    return eth.toFixed(6)
  } catch {
    return "0"
  }
}

export default function ConfirmTransactionPage() {
  const [origin, setOrigin] = useState("")
  const [favicon, setFavicon] = useState("")
  const [txFrom, setTxFrom] = useState("")
  const [txTo, setTxTo] = useState("")
  const [txValue, setTxValue] = useState("0x0")
  const [txData, setTxData] = useState("0x")
  const [walletLocked, setWalletLocked] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [loading, setLoading] = useState(true)
  const [responded, setResponded] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setOrigin(params.get("origin") || "")
    setFavicon(params.get("favicon") || "")
    setTxFrom(params.get("from") || "")
    setTxTo(params.get("to") || "")
    setTxValue(params.get("value") || "0x0")
    setTxData(params.get("data") || "0x")
    setWalletLocked(params.get("locked") === "true")
    setLoading(false)
  }, [])

  const handleUnlockAndApprove = async () => {
    if (responded || !password) return
    setResponded(true)
    setUnlocking(true)
    try {
      // 先解锁钱包
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
      // 解锁成功，直接写 storage 通知 content script
      const params = new URLSearchParams(window.location.search)
      const requestId = params.get("requestId") || ""
      await chrome.storage.local.set({ [`wlt_approval_${requestId}`]: { approved: true } })
      setTimeout(() => window.close(), 100)
    } catch (e) {
      console.error("[WLT Confirm] Failed:", e)
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

  const ethValue = formatEth(txValue)

  return (
    <div className="app-container" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="header">
        <span className="header-title">WLT Wallet</span>
      </div>

      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", overflow: "auto" }}>
        {/* DApp Info */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, margin: "0 auto 8px",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>
            {favicon ? (
              <img src={favicon} alt="" style={{ width: 32, height: 32, borderRadius: 6 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
            ) : "🔗"}
          </div>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, color: "#1a1a2e" }}>交易确认</h2>
          <p style={{ margin: 0, fontSize: 12, color: "#666", wordBreak: "break-all" }}>{origin}</p>
        </div>

        {/* Transaction Details */}
        <div style={{ background: "#f8f9fa", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            交易详情
          </div>
          {/* Value */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>金额</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{ethValue} ETH</div>
          </div>
          {/* From */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>发送方</div>
            <div style={{ fontSize: 12, color: "#333", fontFamily: "monospace", wordBreak: "break-all" }}>{txFrom}</div>
          </div>
          {/* To */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>接收方</div>
            <div style={{ fontSize: 12, color: "#333", fontFamily: "monospace", wordBreak: "break-all" }}>{txTo}</div>
          </div>
          {/* Data */}
          {txData && txData !== "0x" && (
            <div>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>Data</div>
              <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace", wordBreak: "break-all",
                background: "#fff", padding: 8, borderRadius: 6, maxHeight: 60, overflow: "auto" }}>
                {txData}
              </div>
            </div>
          )}
        </div>

        {/* Password input (if locked) */}
        {walletLocked && (
          <div style={{ background: "#fff3cd", borderRadius: 10, padding: 14, marginBottom: 16 }}>
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

        {/* Warning */}
        <div style={{
          background: walletLocked ? "#f8f9fa" : "#fff3cd",
          borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12,
          color: walletLocked ? "#666" : "#856404",
        }}>
          {walletLocked ? "⚠️ 解锁后将自动发送交易" : "⚠️ 请确认以上交易信息无误后点击批准"}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: "auto", display: "flex", gap: 12 }}>
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
            {responded ? (unlocking ? "解锁中..." : "处理中...") : (walletLocked ? "解锁并批准" : "批准")}
          </button>
        </div>
      </div>
    </div>
  )
}
