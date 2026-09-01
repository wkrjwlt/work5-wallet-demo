import { useState } from "react"

import { useWallet } from "~hooks/useWallet"
import { useMessaging } from "~hooks/useMessaging"

export function RecoverWallet() {
  const { setWalletStatus } = useWallet()
  const { recoverWallet } = useMessaging()

  const [mnemonic, setMnemonic] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleRecover = async () => {
    setError("")

    if (!mnemonic.trim()) {
      setError("请输入助记词")
      return
    }

    const words = mnemonic.trim().split(/\s+/)
    if (words.length !== 12) {
      setError("助记词必须是12个单词")
      return
    }

    if (!newPassword) {
      setError("请输入新密码")
      return
    }

    if (newPassword.length < 6) {
      setError("密码至少需要6个字符")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    setLoading(true)
    try {
      const response = await recoverWallet(mnemonic.trim(), newPassword)

      if (response.success) {
        setWalletStatus("locked")
      } else {
        setError(response.error || "恢复失败")
      }
    } catch (err) {
      setError("发生错误")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRecover()
    }
  }

  return (
    <div className="page">
      <div className="page-center">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
        <div className="page-title">通过助记词恢复</div>
        <div className="page-subtitle">输入您的12个助记词和新密码</div>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">助记词</label>
          <textarea
            className="form-input"
            placeholder="输入12个助记词，用空格分隔"
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            rows={3}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">新密码</label>
          <input
            type="password"
            className="form-input"
            placeholder="设置新密码（至少6位）"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">确认密码</label>
          <input
            type="password"
            className="form-input"
            placeholder="再次输入新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button
          className="btn btn-primary btn-block"
          onClick={handleRecover}
          disabled={loading}
        >
          {loading ? "恢复中..." : "恢复钱包"}
        </button>

        <button
          className="btn btn-secondary btn-block"
          onClick={() => setWalletStatus("locked")}
          style={{ marginTop: 8 }}
        >
          返回解锁
        </button>
      </div>
    </div>
  )
}
