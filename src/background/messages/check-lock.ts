import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getCachedSecret } from "./unlock-wallet"

const handler: PlasmoMessaging.MessageHandler<{}, { locked: boolean }> =
  async (_req, res) => {
    const secret = getCachedSecret()
    res.send({ locked: !secret })
  }

export default handler
