import { useState } from "react"

import { useWallet } from "~hooks/useWallet"
import { useMessaging } from "~hooks/useMessaging"
import { ImportMnemonic } from "./ImportMnemonic"
import { ImportPrivateKey } from "./ImportPrivateKey"

export function CreateWallet() {
  const { setWalletStatus, setWalletMeta, setMnemonic } = useWallet()
  const { createWallet } = useMessaging()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"create" | "import-mnemonic" | "import-key">("create")

  const handleCreate = async () => {
    setError("")

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
      const response = await createWallet(password)

      if (response.success && response.mnemonic) {
        setMnemonic(response.mnemonic)
        setWalletMeta({
          id: response.walletId!,
          createdAt: Date.now(),
        })
      } else {
        setError(response.error || "创建钱包失败")
      }
    } catch (err) {
      setError("发生错误")
    } finally {
      setLoading(false)
    }
  }

  if (activeTab === "import-mnemonic") {
    return <ImportMnemonic onBack={() => setActiveTab("create")} />
  }

  if (activeTab === "import-key") {
    return <ImportPrivateKey onBack={() => setActiveTab("create")} />
  }

  return (
    <div className="page">
      <div className="page-center">
        <div className="page-title">创建钱包</div>
        <div className="page-subtitle">
          设置密码以保护您的钱包
        </div>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">密码</label>
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
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "创建中..." : "创建钱包"}
        </button>
      </div>

      <div className="divider" />

      <div style={{ padding: "0 16px" }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 12, textAlign: "center" }}>
          或者导入已有钱包
        </div>

        <button
          className="btn btn-secondary btn-block"
          style={{ marginBottom: 8 }}
          onClick={() => setActiveTab("import-mnemonic")}
        >
          通过助记词导入
        </button>

        <button
          className="btn btn-secondary btn-block"
          onClick={() => setActiveTab("import-key")}
        >
          通过私钥导入
        </button>
      </div>
    </div>
  )
}
