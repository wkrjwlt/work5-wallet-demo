import { useState } from "react"

import { useAccounts } from "~hooks/useAccounts"
import { useWallet } from "~hooks/useWallet"
import { useNetwork } from "~hooks/useNetwork"
import { useMessaging } from "~hooks/useMessaging"
import { formatAddress } from "~lib/utils"

interface Props {
  onBack: () => void
  onLock: () => void
}

export function Settings({ onBack, onLock }: Props) {
  const { activeAccount } = useAccounts()
  const { walletMeta } = useWallet()
  const { activeNetwork } = useNetwork()
  const { exportPrivateKey, exportMnemonic } = useMessaging()
  const [copied, setCopied] = useState(false)

  // 导出流程状态
  const [exportModal, setExportModal] = useState<"privateKey" | "mnemonic" | null>(null)
  const [exportPassword, setExportPassword] = useState("")
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState("")
  const [exportResult, setExportResult] = useState("")
  const [resultCopied, setResultCopied] = useState(false)

  const copyAddress = async () => {
    if (!activeAccount) return
    try {
      await navigator.clipboard.writeText(activeAccount.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleExport = async () => {
    if (!exportPassword || exportLoading) return
    setExportLoading(true)
    setExportError("")
    setExportResult("")

    try {
      // 添加超时保护（15 秒）
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("请求超时，请重试")), 15000)
      )

      let result: { success: boolean; privateKey?: string; mnemonic?: string; error?: string }
      if (exportModal === "privateKey") {
        result = await Promise.race([
          exportPrivateKey(exportPassword),
          timeoutPromise,
        ])
      } else {
        result = await Promise.race([
          exportMnemonic(exportPassword),
          timeoutPromise,
        ])
      }

      if (result.success && (result.privateKey || result.mnemonic)) {
        setExportResult(result.privateKey || result.mnemonic || "")
      } else {
        setExportError(result.error || "导出失败")
      }
    } catch (err: any) {
      setExportError(err.message || "导出失败")
    } finally {
      setExportLoading(false)
    }
  }

  const closeExportModal = () => {
    setExportModal(null)
    setExportPassword("")
    setExportError("")
    setExportResult("")
    setResultCopied(false)
  }

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(exportResult)
      setResultCopied(true)
      setTimeout(() => setResultCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button
          className="btn btn-small btn-secondary"
          onClick={onBack}
          style={{ marginRight: 8 }}
        >
          ‹ 返回
        </button>
        <div className="page-title" style={{ margin: 0 }}>
          设置
        </div>
      </div>

      <div className="card">
        <div className="card-header">账户</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
          地址
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>
            {activeAccount ? formatAddress(activeAccount.address) : ""}
          </span>
          <button className="copy-btn" onClick={copyAddress}>
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">网络</div>
        <div style={{ fontSize: 13 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ color: "#888" }}>名称</span>
            <span>{activeNetwork.name}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ color: "#888" }}>链 ID</span>
            <span>{activeNetwork.chainId}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ color: "#888" }}>货币</span>
            <span>{activeNetwork.currencySymbol}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#888" }}>RPC</span>
            <span
              style={{
                fontSize: 11,
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {activeNetwork.rpcUrl}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">钱包信息</div>
        {walletMeta && (
          <div style={{ fontSize: 13 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ color: "#888" }}>创建时间</span>
              <span>
                {new Date(walletMeta.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#888" }}>ID</span>
              <span style={{ fontSize: 11, fontFamily: "monospace" }}>
                {walletMeta.id.slice(0, 8)}...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 导出区域 */}
      <div className="card">
        <div className="card-header">⚠️ 导出敏感信息</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
          导出的私钥和助记词请妥善保管，切勿分享给他人
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: 13 }}
            onClick={() => setExportModal("privateKey")}
          >
            🔑 导出私钥
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: 13 }}
            onClick={() => setExportModal("mnemonic")}
          >
            📝 导出助记词
          </button>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <button className="btn btn-danger btn-block" onClick={onLock}>
          🔒 锁定钱包
        </button>
      </div>

      {/* 导出私钥弹窗 */}
      {exportModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeExportModal()
          }}
        >
          <div
            style={{
              background: "#1a1a2e",
              borderRadius: 12,
              padding: 20,
              width: "100%",
              maxWidth: 360,
              border: "1px solid #333",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 12 }}>
              {exportModal === "privateKey" ? "🔑 导出私钥" : "📝 导出助记词"}
            </div>

            {!exportResult ? (
              <>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
                  请输入密码以验证身份
                </div>
                <input
                  type="password"
                  className="form-input"
                  placeholder="输入钱包密码"
                  value={exportPassword}
                  onChange={(e) => { setExportPassword(e.target.value); setExportError("") }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleExport() }}
                  autoFocus
                  style={{ marginBottom: 8 }}
                />
                {exportError && (
                  <div style={{ color: "#e94560", fontSize: 12, marginBottom: 8 }}>
                    {exportError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={closeExportModal}
                  >
                    取消
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleExport}
                    disabled={!exportPassword || exportLoading}
                  >
                    {exportLoading ? "验证中..." : "确认导出"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  background: "#0f3460",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  fontSize: exportModal === "mnemonic" ? 14 : 12,
                  color: "#e94560",
                  lineHeight: 1.6,
                  maxHeight: 200,
                  overflow: "auto",
                  userSelect: "all",
                }}>
                  {exportResult}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>
                  {exportModal === "mnemonic"
                    ? "请按顺序抄写助记词并妥善保管"
                    : "请复制私钥并妥善保管"}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={closeExportModal}
                  >
                    关闭
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={copyResult}
                  >
                    {resultCopied ? "✅ 已复制" : "📋 复制"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
