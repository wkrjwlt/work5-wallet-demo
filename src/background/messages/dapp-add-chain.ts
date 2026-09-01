import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import type { Network } from "~store/types"

// 处理 DApp 添加网络请求
const handler: PlasmoMessaging.MessageHandler<
  { params: any },
  { success: boolean; error?: string }
> = async (req, res) => {
  try {
    const { params } = req.body

    const network: Network = {
      chainId: parseInt(params.chainId, 16),
      name: params.chainName,
      rpcUrl: params.rpcUrls[0],
      currencySymbol: params.nativeCurrency.symbol,
      blockExplorerUrl: params.blockExplorerUrls?.[0] || "",
      isDefault: false,
    }

    // 存储网络
    const networksResult = await chrome.storage.local.get(STORAGE_KEYS.NETWORKS)
    const networks: Network[] = networksResult[STORAGE_KEYS.NETWORKS] || []

    // 检查是否已存在
    const exists = networks.some((n) => n.chainId === network.chainId)
    if (!exists) {
      networks.push(network)
      await chrome.storage.local.set({ [STORAGE_KEYS.NETWORKS]: networks })
    }

    res.send({ success: true })
  } catch (error) {
    console.error("dapp-add-chain error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
