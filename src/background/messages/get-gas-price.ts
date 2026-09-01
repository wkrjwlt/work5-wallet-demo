import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { getGasPrice } from "~lib/rpc"
import type { Network } from "~store/types"

// 获取当前 Gas 价格
const handler: PlasmoMessaging.MessageHandler<
  {},
  { success: boolean; gasPrice?: string; error?: string }
> = async (_req, res) => {
  try {
    // 获取当前网络 RPC URL
    const networksResult = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks: Network[] = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId = networksResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID
    const activeNetwork = networks.find((n) => n.chainId === activeChainId)
    const rpcUrl = activeNetwork?.rpcUrl || DEFAULT_NETWORKS[0].rpcUrl

    const gasPrice = await getGasPrice(rpcUrl)

    res.send({ success: true, gasPrice })
  } catch (error) {
    console.error("get-gas-price error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
