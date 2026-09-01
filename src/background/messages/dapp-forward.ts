import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { rpcRequest } from "~lib/rpc"
import type { Network } from "~store/types"

// 处理 DApp 转发的其他 RPC 请求
const handler: PlasmoMessaging.MessageHandler<
  { method: string; params: any[] },
  { result?: any; error?: string }
> = async (req, res) => {
  try {
    const { method, params } = req.body

    // 获取当前网络
    const networksResult = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks: Network[] = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId = networksResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID
    const activeNetwork = networks.find((n) => n.chainId === activeChainId)
    const rpcUrl = activeNetwork?.rpcUrl || DEFAULT_NETWORKS[0].rpcUrl

    // 转发 RPC 请求
    const result = await rpcRequest(rpcUrl, method, params)

    res.send({ result })
  } catch (error) {
    console.error("dapp-forward error:", error)
    res.send({ error: (error as Error).message })
  }
}

export default handler
