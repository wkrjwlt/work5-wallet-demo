import { useState } from "react"

import { useWallet } from "~hooks/useWallet"

interface Props {
  mnemonic: string
}

export function ShowMnemonic({ mnemonic }: Props) {
  const { setMnemonic, setWalletStatus } = useWallet()
  const [confirmed, setConfirmed] = useState(false)

  const words = mnemonic.split(" ")

  const handleConfirm = () => {
    setMnemonic(null)
    // Set status to unlocked since we cached the secret in background
    setWalletStatus("unlocked")
  }

  return (
    <div className="page">
      <div className="page-center">
        <div className="page-title">备份助记词</div>
        <div className="page-subtitle">
          请写下这12个单词并妥善保管
        </div>
      </div>

      <div className="mnemonic-warning">
        ⚠️ 切勿将助记词分享给任何人。拥有助记词的人可以盗取您的资产。
      </div>

      <div className="mnemonic-grid">
        {words.map((word, index) => (
          <div key={index} className="mnemonic-word">
            <div className="mnemonic-word-index">{index + 1}</div>
            {word}
          </div>
        ))}
      </div>

      <div style={{ padding: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <input
            type="checkbox"
            id="confirmed"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <label
            htmlFor="confirmed"
            style={{ fontSize: 13, color: "#aaa", cursor: "pointer" }}
          >
            我已安全保存助记词
          </label>
        </div>

        <button
          className="btn btn-primary btn-block"
          onClick={handleConfirm}
          disabled={!confirmed}
        >
          继续
        </button>
      </div>
    </div>
  )
}
