// ============================================================
// BIP39 mnemonic generation, BIP44 derivation, signing
// Uses ethers.js v6 (bundles BIP39 + BIP32 internally)
// ============================================================

import {
  Mnemonic,
  HDNodeWallet,
  Wallet,
  randomBytes,
  getAddress,
} from "ethers"

import { BIP44_PATH_PREFIX } from "./constants"
import type { Account } from "~store/types"

// ============================================================
// Mnemonic Operations
// ============================================================

/**
 * Generate a new 12-word BIP39 mnemonic phrase.
 */
export function generateMnemonic(): string {
  const mnemonic = Mnemonic.fromEntropy(randomBytes(16))
  return mnemonic.phrase
}

/**
 * Validate a BIP39 mnemonic phrase.
 */
export function validateMnemonic(phrase: string): boolean {
  try {
    Mnemonic.fromPhrase(phrase.trim())
    return true
  } catch {
    return false
  }
}

// ============================================================
// BIP44 Account Derivation
// ============================================================

/**
 * Derive an Ethereum account from a mnemonic at a given BIP44 index.
 */
export function deriveAccountFromMnemonic(
  mnemonic: string,
  index: number,
  name?: string
): Account {
  const mnemonicObj = Mnemonic.fromPhrase(mnemonic.trim())
  const path = `${BIP44_PATH_PREFIX}/${index}`
  const hdNode = HDNodeWallet.fromMnemonic(mnemonicObj, path)

  return {
    index,
    address: getAddress(hdNode.address),
    path,
    name: name || `账户 ${index + 1}`,
    balances: {
      eth: "0x0",
      tokens: {},
    },
  }
}

/**
 * Derive the private key from a mnemonic at a given BIP44 index.
 * WARNING: Only call this in the background service worker!
 */
export function derivePrivateKeyFromMnemonic(
  mnemonic: string,
  index: number
): string {
  const mnemonicObj = Mnemonic.fromPhrase(mnemonic.trim())
  const path = `${BIP44_PATH_PREFIX}/${index}`
  const hdNode = HDNodeWallet.fromMnemonic(mnemonicObj, path)
  return hdNode.privateKey
}

/**
 * Derive an account from a raw private key (for import).
 */
export function deriveAccountFromPrivateKey(
  privateKey: string,
  name?: string
): Account {
  const wallet = new Wallet(privateKey)

  return {
    index: -1,
    address: getAddress(wallet.address),
    path: "imported",
    name: name || "导入的账户",
    balances: {
      eth: "0x0",
      tokens: {},
    },
  }
}

/**
 * Get the private key for an imported account.
 * WARNING: Only call this in the background service worker!
 */
export function getPrivateKeyFromImported(
  importedPrivateKey: string
): string {
  const wallet = new Wallet(importedPrivateKey)
  return wallet.privateKey
}

// ============================================================
// Signing Operations
// ============================================================

/**
 * Sign a message with a private key.
 */
export async function signMessage(
  privateKey: string,
  message: string
): Promise<string> {
  const wallet = new Wallet(privateKey)
  return wallet.signMessage(message)
}

/**
 * Sign a transaction with a private key.
 */
export async function signTransaction(
  privateKey: string,
  transaction: any
): Promise<string> {
  const wallet = new Wallet(privateKey)
  return wallet.signTransaction(transaction)
}

/**
 * Get the address for a private key.
 */
export function getAddressFromPrivateKey(privateKey: string): string {
  const wallet = new Wallet(privateKey)
  return getAddress(wallet.address)
}
