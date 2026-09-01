import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { getBalance as rpcGetBalance } from "~lib/rpc"
import type {
  GetBalanceRequest,
  GetBalanceResponse,
} from "~store/types"

const handler: PlasmoMessaging.MessageHandler<
  GetBalanceRequest,
  GetBalanceResponse
> = async (req, res) => {
  try {
    const { address } = req.body

    // Get the active network's RPC URL
    const networksResult = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId = networksResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID
    const activeNetwork = networks.find((n) => n.chainId === activeChainId)
    const rpcUrl = activeNetwork?.rpcUrl || DEFAULT_NETWORKS[0].rpcUrl

    const balance = await rpcGetBalance(rpcUrl, address)

    res.send({ success: true, balance })
  } catch (error) {
    console.error("get-balance error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
