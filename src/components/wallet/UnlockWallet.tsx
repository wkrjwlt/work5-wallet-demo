import { useState } from "react"

import { useWallet } from "~hooks/useWallet"
import { useMessaging } from "~hooks/useMessaging"

export function UnlockWallet() {
  const { setWalletStatus } = useWallet()
  const { unlockWallet } = useMessaging()

  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleUnlock = async () => {
    setError("")

    if (!password) {
      setError("请输入密码")
      return
    }

    setLoading(true)
    try {
      const response = await unlockWallet(password)

      if (response.success) {
        setWalletStatus("unlocked")
      } else {
        setError(response.error || "密码错误")
      }
    } catch (err) {
      setError("发生错误")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUnlock()
    }
  }

  return (
    <div className="page">
      <div className="page-center">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div className="page-title">欢迎回来</div>
        <div className="page-subtitle">输入密码解锁钱包</div>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">密码</label>
          <input
            type="password"
            className="form-input"
            placeholder="输入您的密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button
          className="btn btn-primary btn-block"
          onClick={handleUnlock}
          disabled={loading}
        >
          {loading ? "解锁中..." : "解锁"}
        </button>

        <button
          className="btn btn-secondary btn-block"
          onClick={() => setWalletStatus("recovering")}
          style={{ marginTop: 8 }}
        >
          忘记密码？通过助记词恢复
        </button>
      </div>
    </div>
  )
}
