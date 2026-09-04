import type { PlasmoMessaging } from "@plasmo-xyz/messaging"
import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { getCachedSecret } from "./unlock-wallet"
import { getGasPrice, estimateGas, getBalance } from "~lib/rpc"
import type { Network } from "~store/types"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { from, to, value, data, origin, favicon, requestId } = req.body || {}

    // 确保 value 是 hex 字符串（bigint 通过 messaging 传递后可能变成 decimal）
    let valueHex = "0x0"
    if (value !== undefined && value !== null) {
      if (typeof value === "bigint") {
        valueHex = "0x" + value.toString(16)
      } else if (typeof value === "string") {
        valueHex = value.startsWith("0x") ? value : "0x" + value
      } else if (typeof value === "number") {
        valueHex = "0x" + BigInt(value).toString(16)
      }
    }
    console.log("[show-transaction-confirm] value received:", value, "→ converted:", valueHex)

    // 返回 pending，立即释放消息通道
    res.send({ pending: true })

    const walletLocked = !getCachedSecret()

    // 获取当前网络 RPC
    const networksResult = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks: Network[] = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId = networksResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID
    const activeNetwork = networks.find((n) => n.chainId === activeChainId)
    const rpcUrl = activeNetwork?.rpcUrl || DEFAULT_NETWORKS[0].rpcUrl

    // 估算 gas 费用
    let gasLimit = "0x5208" // 默认 21000（简单转账）
    let gasPrice = "0x0"
    let gasCostWei = "0x0"
    let balance = "0x0"
    let gasError = ""

    try {
      // 获取 gas price
      gasPrice = await getGasPrice(rpcUrl)

      // 估算 gas limit
      if (from && to) {
        try {
          const estimated = await estimateGas(
            rpcUrl,
            from,
            to,
            valueHex,
            data || "0x"
          )
          // 增加 20% buffer
          const estimatedBigInt = BigInt(estimated)
          const withBuffer = (estimatedBigInt * 120n) / 100n
          gasLimit = "0x" + withBuffer.toString(16)
        } catch {
          // 估算失败，使用默认值（合约调用 100000，简单转账 21000）
          gasLimit = data && data !== "0x" ? "0x186a0" : "0x5208"
        }
      }

      // 计算 gas 费用 (gasLimit * gasPrice)
      const gasLimitBigInt = BigInt(gasLimit)
      const gasPriceBigInt = BigInt(gasPrice)
      gasCostWei = "0x" + (gasLimitBigInt * gasPriceBigInt).toString(16)

      // 获取账户余额
      if (from) {
        balance = await getBalance(rpcUrl, from)
      }
    } catch (e: any) {
      gasError = e?.message || "Gas 估算失败"
      console.warn("[show-transaction-confirm] Gas estimation failed:", e)
    }

    // 构建确认页面 URL
    const confirmUrl = chrome.runtime.getURL("tabs/confirm-transaction.html")
    const urlParams = new URLSearchParams({
      origin: origin || "",
      favicon: favicon || "",
      from: from || "",
      to: to || "",
      value: valueHex,
      data: data || "0x",
      locked: walletLocked ? "true" : "false",
      requestId: requestId || "",
      gasLimit,
      gasPrice,
      gasCostWei,
      balance,
      gasError,
    })
    const fullUrl = `${confirmUrl}?${urlParams.toString()}`

    // 打开确认弹窗
    await chrome.windows.create({
      url: fullUrl,
      type: "popup",
      width: 420,
      height: walletLocked ? 680 : 620,
    })
  } catch (error) {
    console.error("show-transaction-confirm error:", error)
    res.send({ error: (error as Error).message })
  }
}

export default handler
