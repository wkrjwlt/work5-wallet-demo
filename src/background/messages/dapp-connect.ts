import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import type { DAppConnection } from "~store/types"

interface DappConnectRequest {
  origin: string
  favicon?: string
  accounts: string[]
  chainId: number
}

const handler: PlasmoMessaging.MessageHandler<
  DappConnectRequest,
  { success: boolean }
> = async (req, res) => {
  try {
    const { origin, favicon, accounts, chainId } = req.body

    const result = await chrome.storage.local.get(STORAGE_KEYS.DAPPS)
    const connections: DAppConnection[] = result[STORAGE_KEYS.DAPPS] || []

    // Check if already connected
    const existing = connections.find((c) => c.origin === origin)
    if (existing) {
      existing.connectedAccounts = accounts
      existing.connectedChainId = chainId
    } else {
      connections.push({
        origin,
        favicon,
        connectedAccounts: accounts,
        connectedChainId: chainId,
      })
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.DAPPS]: connections })

    res.send({ success: true })
  } catch (error) {
    console.error("dapp-connect error:", error)
    res.send({ success: false })
  }
}

export default handler
