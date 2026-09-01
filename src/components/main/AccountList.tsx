import { useState } from "react"

import { useAccounts } from "~hooks/useAccounts"
import { useMessaging } from "~hooks/useMessaging"
import { formatAddress } from "~lib/utils"

interface Props {
  onBack: () => void
}

export function AccountList({ onBack }: Props) {
  const { accounts, activeAccountIndex, setActiveAccount, addAccount } =
    useAccounts()
  const { deriveAccount } = useMessaging()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleAddAccount = async () => {
    setError("")
    setLoading(true)
    try {
      const nextIndex = accounts.length
      const response = await deriveAccount(nextIndex)

      if (response.success && response.account) {
        addAccount(response.account)
      } else {
        setError(response.error || "添加账户失败")
      }
    } catch (err) {
      console.error("Failed to derive account:", err)
      setError("添加账户失败：" + (err as Error).message)
    } finally {
      setLoading(false)
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
          账户列表
        </div>
      </div>

      <div>
        {accounts.map((account, index) => (
          <div
            key={account.address}
            className={`account-card ${index === activeAccountIndex ? "active" : ""}`}
            onClick={() => {
              setActiveAccount(index)
              onBack()
            }}
          >
            <div className="account-avatar">{account.name.charAt(0)}</div>
            <div className="account-info">
              <div className="account-name">{account.name}</div>
              <div className="account-address">
                {formatAddress(account.address)}
              </div>
              {account.path !== "imported" && (
                <div style={{ fontSize: 10, color: "#666" }}>
                  {account.path}
                </div>
              )}
            </div>
            {index === activeAccountIndex && (
              <span style={{ color: "#e94560" }}>✓</span>
            )}
          </div>
        ))}
      </div>

      {error && <div className="form-error" style={{ marginBottom: 8 }}>{error}</div>}

      <button
        className="btn btn-secondary btn-block"
        onClick={handleAddAccount}
        disabled={loading}
        style={{ marginTop: 12 }}
      >
        {loading ? "派生中..." : "+ 添加账户"}
      </button>
    </div>
  )
}
