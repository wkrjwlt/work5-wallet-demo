import { useState } from "react"

import { useNetwork } from "~hooks/useNetwork"
import type { Network } from "~store/types"

interface Props {
  onBack: () => void
}

export function AddNetwork({ onBack }: Props) {
  const { addNetwork } = useNetwork()

  const [chainId, setChainId] = useState("")
  const [name, setName] = useState("")
  const [rpcUrl, setRpcUrl] = useState("")
  const [currencySymbol, setCurrencySymbol] = useState("")
  const [blockExplorerUrl, setBlockExplorerUrl] = useState("")
  const [error, setError] = useState("")

  const handleAdd = () => {
    setError("")

    if (!chainId || parseInt(chainId) <= 0) {
      setError("无效的链 ID")
      return
    }
    if (!name) {
      setError("请输入网络名称")
      return
    }
    if (!rpcUrl || !rpcUrl.startsWith("http")) {
      setError("无效的 RPC URL")
      return
    }
    if (!currencySymbol) {
      setError("请输入货币符号")
      return
    }

    const network: Network = {
      chainId: parseInt(chainId),
      name,
      rpcUrl,
      currencySymbol: currencySymbol.toUpperCase(),
      blockExplorerUrl: blockExplorerUrl || "",
      isDefault: false,
    }

    addNetwork(network)
    onBack()
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
          添加网络
        </div>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">链 ID</label>
          <input
            className="form-input"
            type="number"
            placeholder="例如 137"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">网络名称</label>
          <input
            className="form-input"
            placeholder="例如 Polygon"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">RPC URL</label>
          <input
            className="form-input"
            placeholder="https://..."
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">货币符号</label>
          <input
            className="form-input"
            placeholder="例如 MATIC"
            value={currencySymbol}
            onChange={(e) => setCurrencySymbol(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">区块浏览器 URL（可选）</label>
          <input
            className="form-input"
            placeholder="https://..."
            value={blockExplorerUrl}
            onChange={(e) => setBlockExplorerUrl(e.target.value)}
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary btn-block" onClick={handleAdd}>
          添加网络
        </button>
      </div>
    </div>
  )
}
