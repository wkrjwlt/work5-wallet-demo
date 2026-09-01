import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import type { Account } from "~store/types"

const handler: PlasmoMessaging.MessageHandler<{}, { accounts: Account[] }> =
  async (_req, res) => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS)
      const accounts: Account[] = result[STORAGE_KEYS.ACCOUNTS] || []

      res.send({ accounts })
    } catch (error) {
      console.error("get-accounts error:", error)
      res.send({ accounts: [] })
    }
  }

export default handler
