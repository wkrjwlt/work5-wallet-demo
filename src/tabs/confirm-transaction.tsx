import { useEffect, useState, useMemo } from "react"
import "../popup.css"

// 合约函数选择器映射（keccak256 前4字节）
const CONTRACT_FUNCTIONS: Record<string, { name: string; params: string[] }> = {
  "0xf6326fb3": { name: "depositETH", params: [] },
  "0x9e2c8a5b": { name: "unstake", params: ["uint256 _pid", "uint256 _amount"] },
  "0x2e1a7d4d": { name: "withdraw", params: ["uint256 _pid"] },
  "0x379607f5": { name: "claim", params: ["uint256 _pid"] },
}

// 解码合约调用 data（传入 value 用于 payable 函数）
function decodeContractData(data: string, value: string): { functionName: string; description: string; amount?: string } | null {
  if (!data || data === "0x" || data.length < 10) return null

  const selector = data.slice(0, 10).toLowerCase()
  const funcInfo = CONTRACT_FUNCTIONS[selector]
  if (!funcInfo) return null

  const result: { functionName: string; description: string; amount?: string } = {
    functionName: funcInfo.name,
    description: "",
    amount: undefined,
  }

  // 解码参数（每32字节一个参数）
  const paramData = data.slice(10)
  const paramChunks: string[] = []
  for (let i = 0; i < paramData.length; i += 64) {
    paramChunks.push(paramData.slice(i, i + 64))
  }

  switch (funcInfo.name) {
    case "depositETH": {
      // payable 函数，金额在 value 字段
      const valueWei = BigInt(value || "0x0")
      const valueEth = Number(valueWei) / 1e18
      result.amount = valueEth.toFixed(6)
      result.description = `质押 ${valueEth.toFixed(6)} ETH`
      break
    }
    case "unstake":
      if (paramChunks.length >= 2) {
        const amountWei = BigInt("0x" + paramChunks[1])
        const amountEth = Number(amountWei) / 1e18
        result.amount = amountEth.toFixed(6)
        result.description = `解除质押 ${amountEth.toFixed(6)} ETH`
      }
      break
    case "withdraw":
      result.description = "提取待领取 ETH"
      break
    case "claim":
      result.description = "领取 MetaNode 奖励"
      break
    default:
      result.description = `合约调用: ${funcInfo.name}`
  }

  return result
}

function formatEth(hexValue: string): string {
  try {
    const wei = BigInt(hexValue || "0x0")
    const eth = Number(wei) / 1e18
    return eth.toFixed(6)
  } catch {
    return "0"
  }
}

function formatEthShort(hexValue: string): string {
  try {
    const wei = BigInt(hexValue || "0x0")
    const eth = Number(wei) / 1e18
    if (eth === 0) return "0"
    if (eth < 0.000001) return "<0.000001"
    return eth.toFixed(6)
  } catch {
    return "0"
  }
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function ConfirmTransactionPage() {
  const [origin, setOrigin] = useState("")
  const [favicon, setFavicon] = useState("")
  const [txFrom, setTxFrom] = useState("")
  const [txTo, setTxTo] = useState("")
  const [txValue, setTxValue] = useState("0x0")
  const [txData, setTxData] = useState("0x")
  const [walletLocked, setWalletLocked] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [loading, setLoading] = useState(true)
  const [responded, setResponded] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  // Gas 相关状态
  const [gasLimit, setGasLimit] = useState("0x5208")
  const [gasPrice, setGasPrice] = useState("0x0")
  const [gasCostWei, setGasCostWei] = useState("0x0")
  const [balance, setBalance] = useState("0x0")
  const [gasError, setGasError] = useState("")

  // 合约调用解码信息（传入 txValue 用于 payable 函数）
  const contractInfo = useMemo(() => decodeContractData(txData, txValue), [txData, txValue])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setOrigin(params.get("origin") || "")
    setFavicon(params.get("favicon") || "")
    setTxFrom(params.get("from") || "")
    setTxTo(params.get("to") || "")
    setTxValue(params.get("value") || "0x0")
    setTxData(params.get("data") || "0x")
    setWalletLocked(params.get("locked") === "true")
    setGasLimit(params.get("gasLimit") || "0x5208")
    setGasPrice(params.get("gasPrice") || "0x0")
    setGasCostWei(params.get("gasCostWei") || "0x0")
    setBalance(params.get("balance") || "0x0")
    setGasError(params.get("gasError") || "")
    setLoading(false)
  }, [])

  // 计算是否余额不足
  const insufficientBalance = useMemo(() => {
    try {
      const totalCost = BigInt(txValue || "0x0") + BigInt(gasCostWei || "0x0")
      const balanceBig = BigInt(balance || "0x0")
      return balanceBig < totalCost
    } catch {
      return false
    }
  }, [txValue, gasCostWei, balance])

  // 总费用（金额 + gas）
  const totalCostWei = useMemo(() => {
    try {
      return BigInt(txValue || "0x0") + BigInt(gasCostWei || "0x0")
    } catch {
      return 0n
    }
  }, [txValue, gasCostWei])

  const handleUnlockAndApprove = async () => {
    if (responded || !password) return
    setResponded(true)
    setUnlocking(true)
    try {
      // 先解锁钱包
      const unlockResult = await chrome.runtime.sendMessage({
        name: "unlock-wallet",
        body: { password },
      })
      if (!unlockResult?.success) {
        setPasswordError(unlockResult?.error || "密码错误")
        setResponded(false)
        setUnlocking(false)
        return
      }
      // 解锁成功，直接写 storage 通知 content script
      const params = new URLSearchParams(window.location.search)
      const requestId = params.get("requestId") || ""
      await chrome.storage.local.set({ [`wlt_approval_${requestId}`]: { approved: true } })
      setTimeout(() => window.close(), 100)
    } catch (e) {
      console.error("[WLT Confirm] Failed:", e)
      window.close()
    }
  }

  const handleApprove = async () => {
    if (responded || insufficientBalance) return
    setResponded(true)
    try {
      const params = new URLSearchParams(window.location.search)
      const requestId = params.get("requestId") || ""
      await chrome.storage.local.set({ [`wlt_approval_${requestId}`]: { approved: true } })
      setTimeout(() => window.close(), 100)
    } catch (e) {
      window.close()
    }
  }

  const handleReject = async () => {
    if (responded) return
    setResponded(true)
    setRejected(true)
    try {
      const params = new URLSearchParams(window.location.search)
      const requestId = params.get("requestId") || ""
      await chrome.storage.local.set({ [`wlt_approval_${requestId}`]: { approved: false } })
      setTimeout(() => window.close(), 100)
    } catch (e) {
      window.close()
    }
  }

  if (loading) {
    return (
      <div className="app-container" style={{ height: "100vh" }}>
        <div className="loading"><div className="spinner" /></div>
      </div>
    )
  }

  const ethValue = formatEth(txValue)
  const gasCostEth = formatEthShort(gasCostWei)
  const balanceEth = formatEthShort(balance)
  const totalCostEth = formatEth("0x" + totalCostWei.toString(16))

  return (
    <div className="app-container" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="header">
        <span className="header-title">WLT Wallet</span>
      </div>

      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", overflow: "auto" }}>
        {/* DApp Info */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, margin: "0 auto 8px",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>
            {favicon ? (
              <img src={favicon} alt="" style={{ width: 30, height: 30, borderRadius: 6 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
            ) : "🔗"}
          </div>
          <h2 style={{ margin: "0 0 2px", fontSize: 15, color: "#1a1a2e" }}>交易确认</h2>
          <p style={{ margin: 0, fontSize: 11, color: "#666", wordBreak: "break-all" }}>{origin}</p>
        </div>

        {/* 交易信息 */}
        <div style={{
          background: "#f0f0ff", borderRadius: 12, padding: "16px 14px", marginBottom: 12,
          textAlign: "center",
        }}>
          {contractInfo ? (
            <>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>{contractInfo.functionName}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{contractInfo.description}</div>
              {contractInfo.amount && (
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>金额: {contractInfo.amount} ETH</div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>交易金额</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1a1a2e" }}>{ethValue} ETH</div>
            </>
          )}
        </div>

        {/* Gas 费用信息 */}
        <div style={{
          background: "#f8f9fa", borderRadius: 12, padding: 14, marginBottom: 12,
        }}>
          <div style={{
            fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
          }}>
            费用详情
          </div>

          {/* Gas Limit */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#666" }}>Gas Limit</span>
            <span style={{ fontSize: 12, color: "#333", fontFamily: "monospace" }}>
              {parseInt(gasLimit, 16).toLocaleString()}
            </span>
          </div>

          {/* Gas Price */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#666" }}>Gas Price</span>
            <span style={{ fontSize: 12, color: "#333", fontFamily: "monospace" }}>
              {formatEthShort(gasPrice)} ETH
            </span>
          </div>

          {/* Gas Fee */}
          <div style={{
            display: "flex", justifyContent: "space-between", marginBottom: 8,
            paddingTop: 8, borderTop: "1px solid #eee",
          }}>
            <span style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>预估 Gas 费用</span>
            <span style={{
              fontSize: 13, color: gasError ? "#dc3545" : "#333", fontWeight: 600,
            }}>
              {gasError ? "估算失败" : `${gasCostEth} ETH`}
            </span>
          </div>

          {/* Total */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            paddingTop: 8, borderTop: "1px solid #eee",
          }}>
            <span style={{ fontSize: 14, color: "#1a1a2e", fontWeight: 700 }}>总计</span>
            <span style={{ fontSize: 14, color: "#1a1a2e", fontWeight: 700 }}>
              {totalCostEth} ETH
            </span>
          </div>
        </div>

        {/* From / To */}
        <div style={{
          background: "#f8f9fa", borderRadius: 12, padding: 14, marginBottom: 12,
        }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>发送方</div>
            <div style={{
              fontSize: 12, color: "#333", fontFamily: "monospace", wordBreak: "break-all",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>{shortenAddress(txFrom)}</span>
              <span style={{ fontSize: 10, color: "#999" }}>|</span>
              <span style={{ fontSize: 11, color: "#666" }}>余额: {balanceEth} ETH</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>接收方</div>
            <div style={{
              fontSize: 12, color: "#333", fontFamily: "monospace", wordBreak: "break-all",
            }}>
              {shortenAddress(txTo)}
            </div>
          </div>
        </div>

        {/* Data (if contract call) */}
        {txData && txData !== "0x" && (
          <div style={{
            background: "#f8f9fa", borderRadius: 12, padding: 14, marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>合约调用 Data</div>
            <div style={{
              fontSize: 10, color: "#666", fontFamily: "monospace", wordBreak: "break-all",
              background: "#fff", padding: 8, borderRadius: 6, maxHeight: 50, overflow: "auto",
              lineHeight: 1.4,
            }}>
              {txData}
            </div>
          </div>
        )}

        {/* 余额不足警告 */}
        {insufficientBalance && (
          <div style={{
            background: "#fff3cd", borderRadius: 10, padding: 12, marginBottom: 12,
            fontSize: 12, color: "#856404", fontWeight: 500,
          }}>
            ⚠️ 账户余额不足以支付交易金额 + Gas 费用。当前余额: {balanceEth} ETH，需要: {totalCostEth} ETH
          </div>
        )}

        {/* Password input (if locked) */}
        {walletLocked && (
          <div style={{ background: "#fff3cd", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#856404", marginBottom: 8, fontWeight: 600 }}>
              🔒 钱包已锁定，请输入密码解锁
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError("") }}
              placeholder="输入钱包密码"
              disabled={responded}
              style={{
                width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8,
                fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleUnlockAndApprove() }}
            />
            {passwordError && (
              <div style={{ color: "#dc3545", fontSize: 12, marginTop: 6 }}>{passwordError}</div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: "auto", display: "flex", gap: 12, paddingTop: 8 }}>
          <button
            onClick={handleReject}
            disabled={responded}
            style={{
              flex: 1, padding: "14px 0", border: "1.5px solid #e0e0e0", borderRadius: 12,
              background: "#fff", color: "#666", fontSize: 15, fontWeight: 600,
              cursor: responded ? "not-allowed" : "pointer", opacity: responded ? 0.5 : 1,
            }}
          >
            拒绝
          </button>
          <button
            onClick={walletLocked ? handleUnlockAndApprove : handleApprove}
            disabled={responded || insufficientBalance || (walletLocked && !password)}
            style={{
              flex: 1, padding: "14px 0", border: "none", borderRadius: 12,
              background: insufficientBalance ? "#ccc" : "linear-gradient(135deg, #667eea, #764ba2)",
              color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: responded || insufficientBalance || (walletLocked && !password) ? "not-allowed" : "pointer",
              opacity: responded || (walletLocked && !password) ? 0.5 : 1,
            }}
          >
            {responded
              ? (rejected ? "已拒绝" : (unlocking ? "解锁中..." : "处理中..."))
              : insufficientBalance
                ? "余额不足"
                : (walletLocked ? "解锁并批准" : "批准")
            }
          </button>
        </div>
      </div>
    </div>
  )
}
