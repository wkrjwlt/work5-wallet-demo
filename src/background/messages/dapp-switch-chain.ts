import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import type { Network } from "~store/types"

// 处理 DApp 切换网络请求
const handler: PlasmoMessaging.MessageHandler<
  { params: any },
  { success: boolean; error?: string }
> = async (req, res) => {
  try {
    const { params } = req.body
    const chainId = parseInt(params.chainId, 16)

    // 检查网络是否存在
    const networksResult = await chrome.storage.local.get(STORAGE_KEYS.NETWORKS)
    const networks: Network[] = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS

    const network = networks.find((n) => n.chainId === chainId)
    if (!network) {
      res.send({ success: false, error: "网络不存在，请先添加该网络" })
      return
    }

    // 切换网络
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_CHAIN_ID]: chainId })

    res.send({ success: true })
  } catch (error) {
    console.error("dapp-switch-chain error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
