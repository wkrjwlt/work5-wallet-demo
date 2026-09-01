import { useState } from "react"

import { useWallet } from "~hooks/useWallet"
import { useMessaging } from "~hooks/useMessaging"

interface Props {
  onBack: () => void
}

export function ImportPrivateKey({ onBack }: Props) {
  const { setWalletMeta } = useWallet()
  const { importPrivateKey } = useMessaging()

  const [privateKey, setPrivateKey] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleImport = async () => {
    setError("")

    const cleanKey = privateKey.trim()
    if (!cleanKey) {
      setError("请输入私钥")
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
      const response = await importPrivateKey(cleanKey, password)

      if (response.success) {
        setWalletMeta({
          id: response.walletId!,
          createdAt: Date.now(),
        })
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
        <div className="page-title">导入私钥</div>
        <div className="page-subtitle">
          输入私钥以导入钱包
        </div>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">私钥</label>
          <input
            type="password"
            className="form-input"
            placeholder="0x... 或粘贴私钥"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
          />
          <div className="form-hint">
            支持 0x 前缀或纯十六进制格式
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
