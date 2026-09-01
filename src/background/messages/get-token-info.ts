import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { getTokenInfo } from "~lib/rpc"
import type { Network } from "~store/types"

// 查询 ERC-20 代币信息
const handler: PlasmoMessaging.MessageHandler<
  { contractAddress: string },
  {
    success: boolean
    symbol?: string
    decimals?: number
    name?: string
    error?: string
  }
> = async (req, res) => {
  try {
    const { contractAddress } = req.body

    console.log("get-token-info: contractAddress =", contractAddress)

    if (!contractAddress || !contractAddress.startsWith("0x")) {
      res.send({ success: false, error: "无效的合约地址" })
      return
    }

    // 获取当前网络 RPC URL
    const networksResult = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks: Network[] = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId = networksResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID
    const activeNetwork = networks.find((n) => n.chainId === activeChainId)
    const rpcUrl = activeNetwork?.rpcUrl || DEFAULT_NETWORKS[0].rpcUrl

    console.log("get-token-info: rpcUrl =", rpcUrl)

    const tokenInfo = await getTokenInfo(rpcUrl, contractAddress)

    console.log("get-token-info: tokenInfo =", tokenInfo)

    if (tokenInfo) {
      res.send({
        success: true,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        name: tokenInfo.name,
      })
    } else {
      res.send({ success: false, error: "无法获取代币信息，请检查合约地址是否正确" })
    }
  } catch (error) {
    console.error("get-token-info error:", error)
    // 确保总是发送响应
    res.send({ success: false, error: (error as Error).message || "查询失败" })
  }
}

export default handler
