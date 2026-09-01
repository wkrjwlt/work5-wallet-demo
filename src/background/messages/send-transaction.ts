import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { sendRawTransaction } from "~lib/rpc"
import type {
  SendTransactionRequest,
  SendTransactionResponse,
} from "~store/types"

const handler: PlasmoMessaging.MessageHandler<
  SendTransactionRequest,
  SendTransactionResponse
> = async (req, res) => {
  try {
    const { signedTx } = req.body

    // Get the active network's RPC URL
    const networksResult = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId = networksResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID
    const activeNetwork = networks.find((n) => n.chainId === activeChainId)
    const rpcUrl = activeNetwork?.rpcUrl || DEFAULT_NETWORKS[0].rpcUrl

    const txHash = await sendRawTransaction(rpcUrl, signedTx)

    res.send({ success: true, txHash })
  } catch (error) {
    console.error("send-transaction error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
