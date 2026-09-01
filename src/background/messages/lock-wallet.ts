import type { PlasmoMessaging } from "@plasmohq/messaging"

import { clearCachedSecret } from "./unlock-wallet"
import type { LockResponse } from "~store/types"

const handler: PlasmoMessaging.MessageHandler<{}, LockResponse> = async (
  _req,
  res
) => {
  try {
    clearCachedSecret()
    res.send({ success: true })
  } catch (error) {
    console.error("lock-wallet error:", error)
    res.send({ success: false })
  }
}

export default handler
