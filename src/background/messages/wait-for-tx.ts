import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { getTransactionReceipt } from "~lib/rpc"
import type { Network } from "~store/types"

// 等待交易确认并返回回执
const handler: PlasmoMessaging.MessageHandler<
  { txHash: string },
  {
    success: boolean
    receipt?: {
      status: string
      blockNumber: string
      gasUsed: string
      cumulativeGasUsed: string
    }
    error?: string
  }
> = async (req, res) => {
  try {
    const { txHash } = req.body

    // 获取当前网络 RPC URL
    const networksResult = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks: Network[] = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId = networksResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID
    const activeNetwork = networks.find((n) => n.chainId === activeChainId)
    const rpcUrl = activeNetwork?.rpcUrl || DEFAULT_NETWORKS[0].rpcUrl

    // 获取交易回执
    const receipt = await getTransactionReceipt(rpcUrl, txHash)

    if (receipt) {
      res.send({
        success: receipt.status === "0x1",
        receipt: {
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          cumulativeGasUsed: receipt.cumulativeGasUsed,
        },
      })
    } else {
      // 交易尚未确认，返回等待状态
      res.send({ success: false })
    }
  } catch (error) {
    console.error("wait-for-tx error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
