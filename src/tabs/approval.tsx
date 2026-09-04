import { useEffect, useState } from "react"
import "../popup.css"

// DApp 连接审批页面
// 通过 chrome.windows.create 打开，类似 MetaMask 的弹窗体验
// Plasmo 会生成 tabs/approval.html
export default function ApprovalPage() {
  const [origin, setOrigin] = useState("")
  const [favicon, setFavicon] = useState("")
  const [addresses, setAddresses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [responded, setResponded] = useState(false)

  useEffect(() => {
    // 从 URL 参数获取审批信息
    const params = new URLSearchParams(window.location.search)
    const originParam = params.get("origin") || ""
    const faviconParam = params.get("favicon") || ""
    const addrsParam = params.get("addresses") || ""

    setOrigin(originParam)
    setFavicon(faviconParam)
    setAddresses(addrsParam ? addrsParam.split(",") : [])
    setLoading(false)
  }, [])

  const handleApprove = async () => {
    if (responded) return
    setResponded(true)
    try {
      // 通知 background 用户已批准
      chrome.runtime.sendMessage({
        name: "wlt-approval-user-response",
        body: { approved: true },
      })
      // 关闭弹窗窗口
      setTimeout(() => window.close(), 100)
    } catch (e) {
      console.error("[WLT Approval] Failed to send approve:", e)
      window.close()
    }
  }

  const handleReject = async () => {
    if (responded) return
    setResponded(true)
    try {
      // 通知 background 用户已拒绝
      chrome.runtime.sendMessage({
        name: "wlt-approval-user-response",
        body: { approved: false },
      })
      // 关闭弹窗窗口
      setTimeout(() => window.close(), 100)
    } catch (e) {
      console.error("[WLT Approval] Failed to send reject:", e)
      window.close()
    }
  }

  if (loading) {
    return (
      <div className="app-container" style={{ height: "100vh" }}>
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="header">
        <span className="header-title">WLT Wallet</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column" }}>
        {/* DApp Info */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 12px",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            {favicon ? (
              <img
                src={favicon}
                alt=""
                style={{ width: 40, height: 40, borderRadius: 8 }}
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            ) : (
              "🔗"
            )}
          </div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#1a1a2e" }}>
            连接请求
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "#666", wordBreak: "break-all" }}>
            {origin}
          </p>
        </div>

        {/* Requested Accounts */}
        <div
          style={{
            background: "#f8f9fa",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#999",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            请求访问以下账户
          </div>
          {addresses.map((addr, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 0",
                borderTop: i > 0 ? "1px solid #eee" : "none",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  marginRight: 10,
                  flexShrink: 0,
                }}
              >
                {addr.slice(2, 4).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#333",
                    wordBreak: "break-all",
                    fontFamily: "monospace",
                  }}
                >
                  {addr}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Permissions Info */}
        <div
          style={{
            background: "#fff3cd",
            borderRadius: 10,
            padding: 12,
            marginBottom: 24,
            fontSize: 12,
            color: "#856404",
          }}
        >
          ⚠️ 此站点将能够查看您的账户地址和余额
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: "auto", display: "flex", gap: 12 }}>
          <button
            onClick={handleReject}
            disabled={responded}
            style={{
              flex: 1,
              padding: "14px 0",
              border: "1.5px solid #e0e0e0",
              borderRadius: 12,
              background: "#fff",
              color: "#666",
              fontSize: 15,
              fontWeight: 600,
              cursor: responded ? "not-allowed" : "pointer",
              opacity: responded ? 0.5 : 1,
            }}
          >
            拒绝
          </button>
          <button
            onClick={handleApprove}
            disabled={responded}
            style={{
              flex: 1,
              padding: "14px 0",
              border: "none",
              borderRadius: 12,
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: responded ? "not-allowed" : "pointer",
              opacity: responded ? 0.5 : 1,
            }}
          >
            {responded ? "处理中..." : "连接"}
          </button>
        </div>
      </div>
    </div>
  )
}
