import { parseEther as ethersParseEther } from "ethers"

/**
 * Format an Ethereum address to shortened form: 0x1234...5678
 */
export function formatAddress(address: string): string {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Format a hex balance (wei) to human-readable ETH string.
 * Input: "0x56bc75e2d63100000" (hex wei)
 * Output: "100.0"
 */
export function formatBalance(hexBalance: string): string {
  if (!hexBalance || hexBalance === "0x0") return "0"

  try {
    const wei = BigInt(hexBalance)
    const eth = Number(wei) / 1e18

    if (eth === 0) return "0"
    if (eth < 0.0001) return "<0.0001"

    // Show up to 4 decimal places
    return eth.toFixed(4).replace(/\.?0+$/, "")
  } catch {
    return "0"
  }
}

/**
 * Format an ETH amount string to hex wei value.
 * Input: "1.5" → "0x14d1120d7b160000"
 */
export function parseEther(ethAmount: string): string {
  const wei = ethersParseEther(ethAmount)
  return "0x" + wei.toString(16)
}

/**
 * Format wei (string or bigint) to ETH with specified decimal places.
 * Input: "1000000000000000000", 4 → "1.0000"
 */
export function formatEther(wei: string | bigint, decimals: number = 4): string {
  try {
    const weiBigInt = typeof wei === "string" ? BigInt(wei) : wei
    const eth = Number(weiBigInt) / 1e18

    if (eth === 0) return "0"
    if (eth < 0.0001) return "<0.0001"

    return eth.toFixed(decimals).replace(/\.?0+$/, "")
  } catch {
    return "0"
  }
}
