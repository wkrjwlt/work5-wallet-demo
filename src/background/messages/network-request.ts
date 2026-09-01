import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { rpcRequest } from "~lib/rpc"
import type {
  NetworkRequestRequest,
  NetworkRequestResponse,
} from "~store/types"

const handler: PlasmoMessaging.MessageHandler<
  NetworkRequestRequest,
  NetworkRequestResponse
> = async (req, res) => {
  try {
    const { method, params } = req.body

    // Get the active network's RPC URL
    const networksResult = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId = networksResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID
    const activeNetwork = networks.find((n) => n.chainId === activeChainId)
    const rpcUrl = activeNetwork?.rpcUrl || DEFAULT_NETWORKS[0].rpcUrl

    const result = await rpcRequest(rpcUrl, method, params)

    res.send({ success: true, result })
  } catch (error) {
    console.error("network-request error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
