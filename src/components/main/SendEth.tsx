import { useState, useEffect } from "react"

import { useAccounts } from "~hooks/useAccounts"
import { useNetwork } from "~hooks/useNetwork"
import { useMessaging } from "~hooks/useMessaging"
import { parseEther, formatAddress, formatEther } from "~lib/utils"
import { DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import type { Network } from "~store/types"

interface Props {
  onBack: () => void
}

export function SendEth({ onBack }: Props) {
  const { activeAccount } = useAccounts()
  const { activeNetwork, networks } = useNetwork()
  const { signTransaction, sendTransaction, getGasPrice, getBalance } =
    useMessaging()

  const [to, setTo] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<
    "form" | "confirm" | "sending" | "waiting" | "success" | "failed"
  >("form")
  const [txHash, setTxHash] = useState("")
  const [gasPrice, setGasPrice] = useState<string>("")
  const [currentBalance, setCurrentBalance] = useState<string>("0")
  const [txDetails, setTxDetails] = useState<{
    to: string
    value: string
    valueWei: string
    gasPrice: string
    gasLimit: string
    estimatedGasFee: string
    total: string
  } | null>(null)
  const [txReceipt, setTxReceipt] = useState<{
    status: string
    blockNumber: string
    gasUsed: string
  } | null>(null)

  // 获取当前 gas price 和余额
  useEffect(() => {
    const fetchData = async () => {
      if (!activeAccount) return

      try {
        const [gasResult, balanceResult] = await Promise.all([
          getGasPrice(),
          getBalance(activeAccount.address),
        ])

        if (gasResult.success && gasResult.gasPrice) {
          setGasPrice(gasResult.gasPrice)
        }

        if (balanceResult.success && balanceResult.balance) {
          setCurrentBalance(balanceResult.balance)
        }
      } catch (err) {
        console.error("Failed to fetch data:", err)
      }
    }
    fetchData()
  }, [activeAccount?.address])

  const handleNext = async () => {
    setError("")

    // 验证地址格式
    if (!to || !to.startsWith("0x") || to.length !== 42) {
      setError("无效的收款地址")
      return
    }

    // 验证是否是校验和格式的地址
    if (!/^0x[0-9a-fA-F]{40}$/.test(to)) {
      setError("地址格式不正确")
      return
    }

    // 验证是否是 EOA 地址（简单检查）
    if (to === "0x0000000000000000000000000000000000000000") {
      setError("不能转账到零地址")
      return
    }

    // 验证是否是自己地址
    if (activeAccount && to.toLowerCase() === activeAccount.address.toLowerCase()) {
      setError("不能转账到自己的地址")
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("无效的金额")
      return
    }

    if (!activeAccount) return

    // 检查余额是否足够
    const valueWei = parseEther(amount)
    const valueBigInt = BigInt(valueWei)

    // 获取最新余额
    let balanceWei = currentBalance
    if (balanceWei === "0") {
      try {
        const result = await getBalance(activeAccount.address)
        if (result.success && result.balance) {
          balanceWei = result.balance
          setCurrentBalance(balanceWei)
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err)
      }
    }

    const balanceBigInt = balanceWei.startsWith("0x")
      ? BigInt(balanceWei)
      : BigInt(balanceWei || "0")

    if (valueBigInt > balanceBigInt) {
      setError(`余额不足。当前余额: ${formatEther(balanceWei)} ETH`)
      return
    }

    setLoading(true)
    try {
      // 获取 gas price
      let currentGasPrice = gasPrice
      if (!currentGasPrice) {
        const result = await getGasPrice()
        if (result.success && result.gasPrice) {
          currentGasPrice = result.gasPrice
        } else {
          throw new Error("无法获取 Gas 价格")
        }
      }

      const gasPriceBigInt = BigInt(currentGasPrice)
      const gasLimit = 21000n
      const estimatedGasFee = gasPriceBigInt * gasLimit
      const totalWei = valueBigInt + estimatedGasFee

      setTxDetails({
        to,
        value: amount,
        valueWei,
        gasPrice: currentGasPrice,
        gasLimit: gasLimit.toString(),
        estimatedGasFee: estimatedGasFee.toString(),
        total: totalWei.toString(),
      })

      setStep("confirm")
    } catch (err) {
      setError("获取交易信息失败: " + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!txDetails || !activeAccount) return

    setStep("sending")
    setLoading(true)
    setError("")

    try {
      const signResponse = await signTransaction({
        address: activeAccount.address,
        to: txDetails.to,
        value: txDetails.valueWei,
        chainId: activeNetwork.chainId,
      })

      if (!signResponse.success || !signResponse.signedTx) {
        setError(signResponse.error || "签名交易失败")
        setStep("confirm")
        return
      }

      const sendResponse = await sendTransaction(signResponse.signedTx)

      if (sendResponse.success && sendResponse.txHash) {
        setTxHash(sendResponse.txHash)
        setStep("waiting")

        // 等待交易确认
        await waitForTxConfirmation(sendResponse.txHash)
      } else {
        setError(sendResponse.error || "发送交易失败")
        setStep("confirm")
      }
    } catch (err) {
      setError("交易失败: " + (err as Error).message)
      setStep("confirm")
    } finally {
      setLoading(false)
    }
  }

  const waitForTxConfirmation = async (hash: string) => {
    const maxAttempts = 30
    const intervalMs = 2000

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await chrome.runtime.sendMessage({
          name: "wait-for-tx",
          body: { txHash: hash },
        })

        if (result.success && result.receipt) {
          setTxReceipt(result.receipt)
          if (result.receipt.status === "0x1") {
            setStep("success")
          } else {
            setStep("failed")
          }
          return
        }

        if (result.error) {
          setError(result.error)
          setStep("failed")
          return
        }
      } catch (err) {
        console.error("Wait for tx error:", err)
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    setError("等待交易确认超时，请稍后查看交易状态")
    setStep("failed")
  }

  const handleReject = () => {
    setStep("form")
    setTxDetails(null)
  }

  const getExplorerUrl = () => {
    const networksList = networks || DEFAULT_NETWORKS
    const activeNet = networksList.find(
      (n: Network) => n.chainId === activeNetwork.chainId
    )
    const explorer = activeNet?.blockExplorerUrl || "https://etherscan.io"
    return `${explorer}/tx/${txHash}`
  }

  // 发送中状态
  if (step === "sending") {
    return (
      <div className="page">
        <div className="page-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div className="page-title">签名并发送交易...</div>
          <div className="form-hint">请等待交易广播到网络</div>
        </div>
      </div>
    )
  }

  // 等待确认状态
  if (step === "waiting") {
    return (
      <div className="page">
        <div className="page-center">
          <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 2s linear infinite" }}>🔄</div>
          <div className="page-title">等待交易确认...</div>
          <div className="form-hint" style={{ marginBottom: 16 }}>
            交易已广播，正在等待矿工确认
          </div>
          <div className="form-hint" style={{ marginBottom: 8 }}>
            交易哈希: {formatAddress(txHash)}
          </div>
          <div style={{ marginTop: 16 }}>
            <a
              href={getExplorerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              在区块浏览器查看 ↗
            </a>
          </div>
        </div>
      </div>
    )
  }

  // 交易失败
  if (step === "failed") {
    return (
      <div className="page">
        <div className="page-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <div className="page-title">交易失败</div>
          <div className="form-hint" style={{ marginBottom: 16 }}>
            {error || "交易未被网络确认"}
          </div>
          <div className="form-hint" style={{ marginBottom: 8 }}>
            交易哈希: {formatAddress(txHash)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <a
              href={getExplorerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              在区块浏览器查看 ↗
            </a>
            <button className="btn btn-primary" onClick={onBack}>
              返回
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 交易成功
  if (step === "success") {
    return (
      <div className="page">
        <div className="page-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div className="page-title">交易已完成！</div>

          <div className="card" style={{ width: "100%", marginTop: 16, textAlign: "left" }}>
            <div className="form-group">
              <label className="form-label">交易哈希</label>
              <div className="form-input" style={{ fontSize: 11, wordBreak: "break-all" }}>
                {txHash}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">区块高度</label>
              <div className="form-input">
                {txReceipt?.blockNumber || "-"}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Gas 使用量</label>
              <div className="form-input">
                {txReceipt?.gasUsed ? parseInt(txReceipt.gasUsed, 16).toString() : "-"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <a
              href={getExplorerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              在区块浏览器查看 ↗
            </a>
            <button className="btn btn-primary" onClick={onBack}>
              完成
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 确认交易页面 - 深色背景配白色文字
  if (step === "confirm" && txDetails) {
    const gasFee = formatEther(txDetails.estimatedGasFee, 6)
    const total = formatEther(txDetails.total, 6)

    return (
      <div className="page">
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <button
            className="btn btn-small btn-secondary"
            onClick={handleReject}
            style={{ marginRight: 8 }}
          >
            ‹ 返回
          </button>
          <div className="page-title" style={{ margin: 0 }}>
            确认交易
          </div>
        </div>

        <div className="card">
          {/* 收款地址 */}
          <div className="form-group">
            <label className="form-label">收款地址</label>
            <div
              style={{
                backgroundColor: "#1a1a2e",
                border: "1px solid #0f3460",
                borderRadius: "8px",
                padding: "10px 12px",
                wordBreak: "break-all",
                fontSize: 12,
                color: "#ffffff",
                fontFamily: "monospace",
              }}
            >
              {txDetails.to}
            </div>
          </div>

          {/* 金额 */}
          <div className="form-group">
            <label className="form-label">金额</label>
            <div
              style={{
                backgroundColor: "#1a1a2e",
                border: "1px solid #0f3460",
                borderRadius: "8px",
                padding: "10px 12px",
                color: "#ffffff",
                fontSize: 14,
              }}
            >
              {txDetails.value} {activeNetwork.currencySymbol}
            </div>
          </div>

          {/* Gas 费用 */}
          <div className="form-group">
            <label className="form-label">Gas 费用（估算）</label>
            <div
              style={{
                backgroundColor: "#1a1a2e",
                border: "1px solid #0f3460",
                borderRadius: "8px",
                padding: "10px 12px",
                color: "#aaaaaa",
                fontSize: 14,
              }}
            >
              ≈ {gasFee} {activeNetwork.currencySymbol}
            </div>
          </div>

          {/* 总计 */}
          <div className="form-group">
            <label className="form-label">总计</label>
            <div
              style={{
                backgroundColor: "#1a1a2e",
                border: "1px solid #e94560",
                borderRadius: "8px",
                padding: "10px 12px",
                fontWeight: "bold",
                fontSize: 16,
                color: "#ffffff",
              }}
            >
              ≈ {total} {activeNetwork.currencySymbol}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={handleReject}
              disabled={loading}
            >
              拒绝
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "签名中..." : "确认"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 默认表单页面
  const displayBalance = formatEther(currentBalance, 6)

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <button
          className="btn btn-small btn-secondary"
          onClick={onBack}
          style={{ marginRight: 8 }}
        >
          ‹ 返回
        </button>
        <div className="page-title" style={{ margin: 0 }}>
          发送 {activeNetwork.currencySymbol}
        </div>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">
            余额: {displayBalance} {activeNetwork.currencySymbol}
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">收款地址</label>
          <input
            className="form-input"
            placeholder="0x..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            金额 ({activeNetwork.currencySymbol})
          </label>
          <input
            className="form-input"
            type="number"
            step="0.0001"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button
          className="btn btn-primary btn-block"
          onClick={handleNext}
          disabled={loading || !to || !amount}
        >
          {loading ? "加载中..." : "下一步"}
        </button>
      </div>
    </div>
  )
}
