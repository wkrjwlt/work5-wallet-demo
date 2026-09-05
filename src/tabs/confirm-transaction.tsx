import { useEffect, useState, useMemo } from "react"
import "../popup.css"

// 合约函数选择器映射（keccak256 前4字节）
const CONTRACT_FUNCTIONS: Record<string, { name: string; params: string[]; isApproval?: boolean }> = {
  "0xf6326fb3": { name: "depositETH", params: [] },
  "0x9e2c8a5b": { name: "unstake", params: ["uint256 _pid", "uint256 _amount"] },
  "0x2e1a7d4d": { name: "withdraw", params: ["uint256 _pid"] },
  "0x379607f5": { name: "claim", params: ["uint256 _pid"] },
  // WETH
  "0xd0e30db0": { name: "deposit", params: [] },
  // SwapRouter
  "0x6c207ad0": { name: "exactInput", params: [] },
  "0xb858183f": { name: "exactInputSingle", params: [] },
  "0x04e45aaf": { name: "exactOutputSingle", params: [] },
  "0xf28c0498": { name: "exactOutput", params: [] },
  // ERC20 标准函数
  "0x095ea7b3": { name: "approve", params: ["address spender", "uint256 amount"], isApproval: true },
  "0xa9059cbb": { name: "transfer", params: ["address to", "uint256 amount"] },
  "0x23b872dd": { name: "transferFrom", params: ["address from", "address to", "uint256 amount"] },
}

// 解码合约调用 data（传入 value 用于 payable 函数）
function decodeContractData(data: string, value: string): {
  functionName: string; description: string; amount?: string; isApproval?: boolean; spender?: string;
  tokenIn?: string; tokenOut?: string; amountInFormatted?: string; amountOutFormatted?: string;
} | null {
  if (!data || data === "0x" || data.length < 10) return null

  const selector = data.slice(0, 10).toLowerCase()
  const funcInfo = CONTRACT_FUNCTIONS[selector]
  if (!funcInfo) return null

  const result: {
    functionName: string; description: string; amount?: string; isApproval?: boolean; spender?: string;
    tokenIn?: string; tokenOut?: string; amountInFormatted?: string; amountOutFormatted?: string;
  } = {
    functionName: funcInfo.name,
    description: "",
    amount: undefined,
    isApproval: funcInfo.isApproval,
    spender: undefined,
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
    case "deposit":
      // WETH deposit - payable 函数，金额在 value 字段
      {
        const valueWei = BigInt(value || "0x0")
        const valueEth = Number(valueWei) / 1e18
        result.amount = valueEth.toFixed(6)
        result.description = `将 ${valueEth.toFixed(6)} ETH 包装为 WETH`
      }
      break
    case "exactInput":
      // Custom SwapRouter exactInput: (address tokenIn, address tokenOut, uint32[] indexPath, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)
      // ABI encoding: [0]=offset to tuple, [1]=tokenIn, [2]=tokenOut, [3]=offset to indexPath, [4]=recipient, [5]=deadline, [6]=amountIn, [7]=amountOutMinimum, [8]=sqrtPriceLimitX96
      if (paramChunks.length >= 8) {
        const tokenIn = "0x" + paramChunks[1].slice(24)
        const tokenOut = "0x" + paramChunks[2].slice(24)
        const amountInWei = BigInt("0x" + paramChunks[6])
        const amountOutWei = BigInt("0x" + paramChunks[7])
        const amountIn = Number(amountInWei) / 1e18
        const amountOut = Number(amountOutWei) / 1e18
        result.amount = amountIn.toFixed(6)
        result.tokenIn = tokenIn
        result.tokenOut = tokenOut
        result.amountInFormatted = amountIn.toFixed(6)
        result.amountOutFormatted = amountOut.toFixed(6)
        result.description = `交换 ${amountIn.toFixed(6)} ETH → 最少 ${amountOut.toFixed(6)} 代币`
      }
      break
    case "exactInputSingle":
      // SwapRouter exactInputSingle: (address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)
      if (paramChunks.length >= 7) {
        const tokenIn = "0x" + paramChunks[0].slice(24)
        const tokenOut = "0x" + paramChunks[1].slice(24)
        const amountInWei = BigInt("0x" + paramChunks[5])
        const amountOutWei = BigInt("0x" + paramChunks[6])
        const amountIn = Number(amountInWei) / 1e18
        const amountOut = Number(amountOutWei) / 1e18
        result.amount = amountIn.toFixed(6)
        result.tokenIn = tokenIn
        result.tokenOut = tokenOut
        result.amountInFormatted = amountIn.toFixed(6)
        result.amountOutFormatted = amountOut.toFixed(6)
        result.description = `交换 ${amountIn.toFixed(6)} ETH → 最少 ${amountOut.toFixed(6)} 代币`
      }
      break
    case "exactOutput":
      if (paramChunks.length >= 5) {
        const amountOutWei = BigInt("0x" + paramChunks[3])
        const amountInWei = BigInt("0x" + paramChunks[4])
        const amountOut = Number(amountOutWei) / 1e18
        const amountIn = Number(amountInWei) / 1e18
        result.amount = amountIn.toFixed(6)
        result.description = `交换最多 ${amountIn.toFixed(6)} 代币 → 精确 ${amountOut.toFixed(6)} 代币`
      }
      break
    case "exactOutputSingle":
      if (paramChunks.length >= 7) {
        const amountOutWei = BigInt("0x" + paramChunks[4])
        const amountInWei = BigInt("0x" + paramChunks[5])
        const amountOut = Number(amountOutWei) / 1e18
        const amountIn = Number(amountInWei) / 1e18
        result.amount = amountIn.toFixed(6)
        result.description = `交换最多 ${amountIn.toFixed(6)} 代币 → 精确 ${amountOut.toFixed(6)} 代币`
      }
      break
    case "approve": {
      // ERC20 approve(address spender, uint256 amount)
      if (paramChunks.length >= 2) {
        const spenderAddress = "0x" + paramChunks[0].slice(24)
        const amountWei = BigInt("0x" + paramChunks[1])
        // 检查是否是无限授权
        const maxApproval = BigInt(2) ** BigInt(256) - BigInt(1)
        if (amountWei >= maxApproval) {
          result.description = "无限授权"
          result.amount = "∞"
        } else {
          result.amount = amountWei.toString()
          result.description = "授权 spending"
        }
        result.spender = spenderAddress
      }
      break
    }
    case "transfer":
      if (paramChunks.length >= 2) {
        const toAddress = "0x" + paramChunks[0].slice(24)
        const amountWei = BigInt("0x" + paramChunks[1])
        result.amount = amountWei.toString()
        result.description = `转账给 ${shortenAddress(toAddress)}`
      }
      break
    case "transferFrom":
      if (paramChunks.length >= 3) {
        const fromAddress = "0x" + paramChunks[0].slice(24)
        const toAddress = "0x" + paramChunks[1].slice(24)
        const amountWei = BigInt("0x" + paramChunks[2])
        result.amount = amountWei.toString()
        result.description = `从 ${shortenAddress(fromAddress)} 转账给 ${shortenAddress(toAddress)}`
      }
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
  const [gasCostWei, setGasCostWei] = useState("0x0")
  const [balance, setBalance] = useState("0x0")
  const [gasError, setGasError] = useState("")

  // 合约调用解码信息（传入 txValue 用于 payable 函数）
  const contractInfo = useMemo(() => decodeContractData(txData, txValue), [txData, txValue])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setOrigin(params.get("origin") || "")
    setFavicon(params.get("favicon") || "")
    setTxTo(params.get("to") || "")
    setTxValue(params.get("value") || "0x0")
    setTxData(params.get("data") || "0x")
    setWalletLocked(params.get("locked") === "true")
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
          <h2 style={{ margin: "0 0 2px", fontSize: 15, color: "#1a1a2e" }}>
            {contractInfo?.isApproval ? "授权请求" : "交易确认"}
          </h2>
          <p style={{ margin: 0, fontSize: 11, color: "#666", wordBreak: "break-all" }}>{origin}</p>
        </div>

        {/* 交易信息 - 授权请求样式 */}
        {contractInfo?.isApproval ? (
          <div style={{
            background: "#fff8e6", borderRadius: 12, padding: "16px 14px", marginBottom: 12,
            textAlign: "center", border: "1px solid #ffd700",
          }}>
            {/* 授权图标 */}
            <div style={{
              width: 48, height: 48, margin: "0 auto 12px",
              background: "linear-gradient(135deg, #ffd700, #ffaa00)",
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>
              🔐
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>
              允许 {shortenAddress(txTo)} 使用您的代币
            </div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
              授权合约可以自动转移您的代币
            </div>
            {contractInfo.spender && (
              <div style={{
                background: "#fff", borderRadius: 8, padding: "8px 12px", marginTop: 12,
                fontSize: 11, color: "#333", fontFamily: "monospace", wordBreak: "break-all",
              }}>
                <span style={{ color: "#999" }}>授权给: </span>
                {contractInfo.spender}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: "#fff", borderRadius: 12, padding: "16px 14px", marginBottom: 12,
            border: "1px solid #e8e8e8",
          }}>
            {/* 标题 */}
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 14, textAlign: "center" }}>
              交易请求
            </div>

            {/* 余额变化区域 - MetaMask 风格 */}
            {contractInfo?.functionName === "exactInput" || contractInfo?.functionName === "exactInputSingle" ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#999", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  余额变化
                </div>
                {/* 您发送 */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, marginBottom: 6,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, color: "#333", fontWeight: 600 }}>您发送</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>
                      - {contractInfo.amountInFormatted || contractInfo.amount} {contractInfo.functionName === "exactInput" ? "ETH" : "ETH"}
                    </div>
                    <div style={{ fontSize: 11, color: "#999", fontFamily: "monospace" }}>
                      {contractInfo.tokenIn ? shortenAddress(contractInfo.tokenIn) : ""}
                    </div>
                  </div>
                </div>
                {/* 您收到 */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", background: "#f0fff4", borderRadius: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, color: "#333", fontWeight: 600 }}>您收到</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#38a169" }}>
                      + {contractInfo.amountOutFormatted || "?"} 代币
                    </div>
                    <div style={{ fontSize: 11, color: "#999", fontFamily: "monospace" }}>
                      {contractInfo.tokenOut ? shortenAddress(contractInfo.tokenOut) : ""}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 非 swap 交易 - 简单金额显示 */
              <div style={{
                background: "#f0f0ff", borderRadius: 10, padding: "14px 12px", marginBottom: 14,
                textAlign: "center",
              }}>
                {contractInfo ? (
                  <>
                    <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>{contractInfo.functionName}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>{contractInfo.description}</div>
                    {contractInfo.amount && (
                      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>金额: {contractInfo.amount} ETH</div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>交易金额</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>{ethValue} ETH</div>
                  </>
                )}
              </div>
            )}

            {/* 网络信息 */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 12px", background: "#f8f9fa", borderRadius: 8, marginBottom: 6,
            }}>
              <span style={{ fontSize: 12, color: "#999" }}>网络</span>
              <span style={{ fontSize: 12, color: "#333", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#627EEA", display: "inline-block" }}></span>
                Sepolia
              </span>
            </div>

            {/* 请求来自 */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 12px", background: "#f8f9fa", borderRadius: 8, marginBottom: 6,
            }}>
              <span style={{ fontSize: 12, color: "#999" }}>请求来自</span>
              <span style={{ fontSize: 12, color: "#333" }}>{origin || "未知来源"}</span>
            </div>

            {/* 交互目标 */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 12px", background: "#f8f9fa", borderRadius: 8, marginBottom: 6,
            }}>
              <span style={{ fontSize: 12, color: "#999" }}>交互目标</span>
              <span style={{ fontSize: 12, color: "#333", fontFamily: "monospace" }}>{shortenAddress(txTo)}</span>
            </div>

            {/* 网络费 */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 12px", background: "#f8f9fa", borderRadius: 8, marginBottom: 6,
            }}>
              <span style={{ fontSize: 12, color: "#999" }}>网络费</span>
              <span style={{ fontSize: 12, color: gasError ? "#dc3545" : "#333" }}>
                {gasError ? "估算失败" : `≈ ${gasCostEth} SepoliaETH`}
              </span>
            </div>

            {/* 总计 */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, marginTop: 4,
            }}>
              <span style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 700 }}>总计</span>
              <span style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 700 }}>
                {totalCostEth} ETH
              </span>
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
            {contractInfo?.isApproval ? "拒绝" : "拒绝"}
          </button>
          <button
            onClick={walletLocked ? handleUnlockAndApprove : handleApprove}
            disabled={responded || insufficientBalance || (walletLocked && !password)}
            style={{
              flex: 1, padding: "14px 0", border: "none", borderRadius: 12,
              background: insufficientBalance ? "#ccc" : (contractInfo?.isApproval
                ? "linear-gradient(135deg, #ffd700, #ffaa00)"
                : "linear-gradient(135deg, #667eea, #764ba2)"),
              color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: responded || insufficientBalance || (walletLocked && !password) ? "not-allowed" : "pointer",
              opacity: responded || (walletLocked && !password) ? 0.5 : 1,
            }}
          >
            {responded
              ? (rejected ? "已拒绝" : (unlocking ? "解锁中..." : "处理中..."))
              : insufficientBalance
                ? "余额不足"
                : (walletLocked
                  ? (contractInfo?.isApproval ? "解锁并授权" : "解锁并批准")
                  : (contractInfo?.isApproval ? "确认授权" : "批准"))
            }
          </button>
        </div>
      </div>
    </div>
  )
}
