import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import { deriveAccountFromMnemonic } from "~lib/keyring"
import { loadVault } from "~lib/vault"
import { getCachedSecret } from "./unlock-wallet"
import type {
  DeriveAccountRequest,
  DeriveAccountResponse,
  Account,
} from "~store/types"

const handler: PlasmoMessaging.MessageHandler<
  DeriveAccountRequest,
  DeriveAccountResponse
> = async (req, res) => {
  try {
    const { index } = req.body
    const secret = getCachedSecret()

    if (!secret) {
      res.send({ success: false, error: "钱包已锁定" })
      return
    }

    const vault = await loadVault()
    if (!vault) {
      res.send({ success: false, error: "未找到钱包" })
      return
    }

    let account: Account

    if (vault.vaultType === "hd") {
      // HD wallet - derive from mnemonic
      account = deriveAccountFromMnemonic(secret, index, `账户 ${index + 1}`)
    } else {
      // Imported private key - cannot derive additional accounts
      res.send({
        success: false,
        error: "导入的私钥无法派生更多账户",
      })
      return
    }

    // Store the new account
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS)
    const accounts: Account[] = result[STORAGE_KEYS.ACCOUNTS] || []
    accounts.push(account)
    await chrome.storage.local.set({ [STORAGE_KEYS.ACCOUNTS]: accounts })

    res.send({ success: true, account })
  } catch (error) {
    console.error("derive-account error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
