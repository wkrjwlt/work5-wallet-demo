import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_CHAIN_ID } from "~lib/constants"

// 获取当前链ID
const handler: PlasmoMessaging.MessageHandler<
  {},
  { chainId: number }
> = async (_req, res) => {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_CHAIN_ID)
    const chainId = result[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID

    res.send({ chainId })
  } catch (error) {
    console.error("get-chain-id error:", error)
    res.send({ chainId: DEFAULT_CHAIN_ID })
  }
}

export default handler
