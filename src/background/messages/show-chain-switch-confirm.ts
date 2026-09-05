import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getCachedSecret } from "./unlock-wallet"
import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import type { Network } from "~store/types"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { chainId, origin, favicon, requestId } = req.body || {}

    // 返回 pending，立即释放消息通道
    res.send({ pending: true })

    const walletLocked = !getCachedSecret()

    // 获取目标链名称
    const networksResult = await chrome.storage.local.get(STORAGE_KEYS.NETWORKS)
    const networks: Network[] = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const targetChainId = parseInt(chainId, 16)
    const targetNetwork = networks.find((n) => n.chainId === targetChainId)
    const chainName = targetNetwork?.name || `Chain ${targetChainId}`

    // 构建确认页面 URL
    const confirmUrl = chrome.runtime.getURL("tabs/confirm-chain-switch.html")
    const urlParams = new URLSearchParams({
      origin: origin || "",
      favicon: favicon || "",
      chainId: chainId || "",
      chainName,
      locked: walletLocked ? "true" : "false",
      requestId: requestId || "",
    })
    const fullUrl = `${confirmUrl}?${urlParams.toString()}`

    // 打开确认弹窗
    await chrome.windows.create({
      url: fullUrl,
      type: "popup",
      width: 420,
      height: walletLocked ? 580 : 480,
    })
  } catch (error) {
    console.error("show-chain-switch-confirm error:", error)
    res.send({ error: (error as Error).message })
  }
}

export default handler
