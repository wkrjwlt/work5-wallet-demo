import { useState } from "react"

import { useWallet } from "~hooks/useWallet"
import { useMessaging } from "~hooks/useMessaging"

interface Props {
  onBack: () => void
}

export function ImportMnemonic({ onBack }: Props) {
  const { setWalletMeta, setWalletStatus } = useWallet()
  const { importMnemonic } = useMessaging()

  const [mnemonic, setMnemonic] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleImport = async () => {
    setError("")

    const words = mnemonic.trim().split(/\s+/)
    if (words.length !== 12) {
      setError("助记词必须是12个单词")
      return
    }

    if (password.length < 6) {
      setError("密码至少需要6个字符")
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    setLoading(true)
    try {
      const response = await importMnemonic(mnemonic, password)

      if (response.success) {
        setWalletMeta({
          id: response.walletId!,
          createdAt: Date.now(),
        })
        // Set status to unlocked since we cached the secret in background
        setWalletStatus("unlocked")
      } else {
        setError(response.error || "导入钱包失败")
      }
    } catch (err) {
      setError("发生错误")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-center">
        <div className="page-title">导入钱包</div>
        <div className="page-subtitle">
          输入您的12个助记词
        </div>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">助记词（12个单词）</label>
          <textarea
            className="form-input"
            placeholder="word1 word2 word3 ..."
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            rows={3}
          />
          <div className="form-hint">
            用空格分隔的12个英文单词
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">设置密码</label>
          <input
            type="password"
            className="form-input"
            placeholder="输入密码（至少6个字符）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">确认密码</label>
          <input
            type="password"
            className="form-input"
            placeholder="再次输入密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button
          className="btn btn-primary btn-block"
          onClick={handleImport}
          disabled={loading}
        >
          {loading ? "导入中..." : "导入钱包"}
        </button>
      </div>

      <div style={{ padding: "12px 16px" }}>
        <button className="btn btn-secondary btn-block" onClick={onBack}>
          返回
        </button>
      </div>
    </div>
  )
}
