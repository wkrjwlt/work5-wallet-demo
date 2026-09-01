import { useState, useEffect, useRef } from "react"

import { useTokens } from "~hooks/useTokens"
import { useNetwork } from "~hooks/useNetwork"
import { useMessaging } from "~hooks/useMessaging"

interface Props {
  onBack: () => void
}

export function TokenList({ onBack }: Props) {
  const { tokens, addToken, removeToken } = useTokens()
  const { activeChainId } = useNetwork()
  const { getTokenInfo } = useMessaging()

  const [showAdd, setShowAdd] = useState(false)
  const [contractAddress, setContractAddress] = useState("")
  const [symbol, setSymbol] = useState("")
  const [decimals, setDecimals] = useState("18")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const filteredTokens = tokens.filter((t) => t.chainId === activeChainId)

  // 当合约地址变化时，延迟查询代币信息
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // 清空之前的结果
    if (contractAddress && contractAddress.startsWith("0x") && contractAddress.length === 42) {
      setFetched(false)
      setSymbol("")
      setDecimals("18")
      setError("")

      // 300ms 防抖
      debounceRef.current = setTimeout(async () => {
        setLoading(true)
        setError("")
        console.log("Querying token info for:", contractAddress)
        try {
          const result = await getTokenInfo(contractAddress)
          console.log("Token info result:", result)
          if (result.success && result.symbol) {
            setSymbol(result.symbol)
            setDecimals(result.decimals?.toString() || "18")
            setFetched(true)
          } else {
            setError(result.error || "无法获取代币信息")
          }
        } catch (err) {
          console.error("Token info error:", err)
          setError("查询代币信息失败: " + (err as Error).message)
        } finally {
          setLoading(false)
        }
      }, 300)
    } else {
      setSymbol("")
      setDecimals("18")
      setFetched(false)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [contractAddress])

  const handleAdd = () => {
    setError("")

    if (!contractAddress || !contractAddress.startsWith("0x")) {
      setError("无效的合约地址")
      return
    }

    if (!symbol) {
      setError("请先查询代币信息")
      return
    }

    addToken({
      contractAddress,
      symbol: symbol.toUpperCase(),
      name: symbol, // 使用 symbol 作为 name
      decimals: parseInt(decimals),
      chainId: activeChainId,
    })

    setContractAddress("")
    setSymbol("")
    setDecimals("18")
    setFetched(false)
    setShowAdd(false)
  }

  const handleCancel = () => {
    setShowAdd(false)
    setContractAddress("")
    setSymbol("")
    setDecimals("18")
    setFetched(false)
    setError("")
  }

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            className="btn btn-small btn-secondary"
            onClick={onBack}
            style={{ marginRight: 8 }}
          >
            ‹ 返回
          </button>
          <div className="page-title" style={{ margin: 0 }}>
            代币列表
          </div>
        </div>
        <button
          className="btn btn-small btn-primary"
          onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? "取消" : "+ 添加"}
        </button>
      </div>

      {showAdd && (
        <div className="card">
          {/* 合约地址 */}
          <div className="form-group">
            <label className="form-label">合约地址</label>
            <input
              className="form-input"
              placeholder="输入 ERC-20 代币合约地址 (0x...)"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
            />
          </div>

          {/* 查询状态 */}
          {loading && (
            <div className="form-hint" style={{ marginBottom: 12 }}>
              🔄 正在查询代币信息...
            </div>
          )}

          {/* 查询成功 - 显示代币信息 */}
          {fetched && !loading && symbol && (
            <>
              <div className="form-group">
                <label className="form-label">代币符号</label>
                <div
                  style={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid #0f3460",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#4ade80",
                    fontSize: 14,
                  }}
                >
                  ✅ {symbol}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">精度 (Decimals)</label>
                <input
                  className="form-input"
                  type="number"
                  value={decimals}
                  onChange={(e) => setDecimals(e.target.value)}
                />
              </div>
            </>
          )}

          {error && <div className="form-error">{error}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={handleCancel}
            >
              取消
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleAdd}
              disabled={loading || !fetched || !symbol}
            >
              添加代币
            </button>
          </div>
        </div>
      )}

      {filteredTokens.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🪙</div>
          <div>当前网络没有代币</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            点击"+ 添加"添加自定义代币
          </div>
        </div>
      ) : (
        filteredTokens.map((token) => (
          <div key={`${token.contractAddress}-${token.chainId}`} className="token-item">
            <div className="token-icon">
              {token.symbol.slice(0, 3)}
            </div>
            <div className="token-info">
              <div className="token-symbol">{token.symbol}</div>
              <div className="token-name">{token.name}</div>
            </div>
            <div className="token-balance">
              <div className="token-balance-amount">
                {token.balance || "0"}
              </div>
            </div>
            <button
              className="copy-btn"
              onClick={() =>
                removeToken(token.contractAddress, token.chainId)
              }
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  )
}
