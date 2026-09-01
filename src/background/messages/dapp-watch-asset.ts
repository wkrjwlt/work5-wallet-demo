import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_CHAIN_ID } from "~lib/constants"

// 处理 DApp 添加代币请求
const handler: PlasmoMessaging.MessageHandler<
  { params: any },
  { success: boolean; error?: string }
> = async (req, res) => {
  try {
    const { params } = req.body
    const { type, options } = params

    if (!["ERC20", "ERC721", "ERC1155"].includes(type)) {
      res.send({ success: false, error: "不支持的代币类型" })
      return
    }

    // 获取当前链ID
    const chainResult = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_CHAIN_ID)
    const chainId = chainResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID

    // 创建代币对象
    const token = {
      contractAddress: options.address,
      symbol: options.symbol,
      name: options.symbol,
      decimals: options.decimals || 18,
      chainId,
      logoUrl: options.image,
    }

    // 存储代币
    const tokensResult = await chrome.storage.local.get(STORAGE_KEYS.TOKENS)
    const tokens = tokensResult[STORAGE_KEYS.TOKENS] || []

    // 检查是否已存在
    const exists = tokens.some(
      (t: any) =>
        t.contractAddress.toLowerCase() === token.contractAddress.toLowerCase() &&
        t.chainId === token.chainId
    )

    if (!exists) {
      tokens.push(token)
      await chrome.storage.local.set({ [STORAGE_KEYS.TOKENS]: tokens })
    }

    res.send({ success: true })
  } catch (error) {
    console.error("dapp-watch-asset error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
