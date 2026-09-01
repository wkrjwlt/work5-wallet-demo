import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import type { DAppConnection } from "~store/types"

interface DappDisconnectRequest {
  origin: string
}

const handler: PlasmoMessaging.MessageHandler<
  DappDisconnectRequest,
  { success: boolean }
> = async (req, res) => {
  try {
    const { origin } = req.body

    const result = await chrome.storage.local.get(STORAGE_KEYS.DAPPS)
    const connections: DAppConnection[] = result[STORAGE_KEYS.DAPPS] || []

    const filtered = connections.filter((c) => c.origin !== origin)
    await chrome.storage.local.set({ [STORAGE_KEYS.DAPPS]: filtered })

    res.send({ success: true })
  } catch (error) {
    console.error("dapp-disconnect error:", error)
    res.send({ success: false })
  }
}

export default handler
