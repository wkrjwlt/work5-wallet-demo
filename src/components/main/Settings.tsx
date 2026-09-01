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
  const [copied, setCopied] = useState(false)

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

      <div style={{ padding: "0 16px" }}>
        <button className="btn btn-danger btn-block" onClick={onLock}>
          🔒 锁定钱包
        </button>
      </div>
    </div>
  )
}
