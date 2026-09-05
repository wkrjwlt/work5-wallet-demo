import { useEffect, useState } from "react"
import "../popup.css"

// 已知链名称映射
const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  5: "Goerli",
  11155111: "Sepolia Testnet",
  17000: "Holesky Testnet",
  137: "Polygon",
  80001: "Mumbai",
  56: "BNB Chain",
  97: "BSC Testnet",
  42161: "Arbitrum One",
  421614: "Arbitrum Sepolia",
  10: "Optimism",
  11155420: "Optimism Sepolia",
  8453: "Base",
  84532: "Base Sepolia",
  43114: "Avalanche",
  43113: "Avalanche Fuji",
}

export default function ConfirmChainSwitchPage() {
  const [origin, setOrigin] = useState("")
  const [favicon, setFavicon] = useState("")
  const [chainId, setChainId] = useState("")
  const [chainName, setChainName] = useState("")
  const [walletLocked, setWalletLocked] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [loading, setLoading] = useState(true)
  const [responded, setResponded] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cid = params.get("chainId") || ""
    const cname = params.get("chainName") || ""
    setOrigin(params.get("origin") || "")
    setFavicon(params.get("favicon") || "")
    setChainId(cid)
    // 如果没有传入 chainName，尝试从已知链中查找
    const chainIdNum = parseInt(cid, 16)
    setChainName(cname || CHAIN_NAMES[chainIdNum] || `Chain ${chainIdNum}`)
    setWalletLocked(params.get("locked") === "true")
    setLoading(false)
  }, [])

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
      console.error("[WLT ChainSwitch] Failed:", e)
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

  const chainIdHex = chainId.startsWith("0x") ? chainId : `0x${parseInt(chainId).toString(16)}`
  const chainIdDecimal = parseInt(chainIdHex, 16)

  return (
    <div className="app-container" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="header">
        <span className="header-title">WLT Wallet</span>
      </div>

      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column" }}>
        {/* DApp Info */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
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
          <h2 style={{ margin: "0 0 2px", fontSize: 15, color: "#1a1a2e" }}>链切换请求</h2>
          <p style={{ margin: 0, fontSize: 11, color: "#666", wordBreak: "break-all" }}>{origin}</p>
        </div>

        {/* 链信息 */}
        <div style={{
          background: "#f0f0ff", borderRadius: 12, padding: "16px 14px", marginBottom: 16,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>请求切换到</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>
            {chainName}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            Chain ID: {chainIdDecimal} ({chainIdHex})
          </div>
        </div>

        {/* 安全提示 */}
        <div style={{
          background: "#fff3cd", borderRadius: 10, padding: 12, marginBottom: 16,
          fontSize: 12, color: "#856404",
        }}>
          ⚠️ 请确认您信任此 DApp 的链切换请求。切换到未知链可能存在风险。
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
              : (walletLocked ? "解锁并切换" : "切换")
            }
          </button>
        </div>
      </div>
    </div>
  )
}
