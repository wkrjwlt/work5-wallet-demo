import { useState } from "react"

import { useNetwork } from "~hooks/useNetwork"

interface Props {
  onAddNetwork: () => void
}

export function NetworkSwitcher({ onAddNetwork }: Props) {
  const { networks, activeChainId, setActiveNetwork, activeNetwork } =
    useNetwork()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: "relative" }}>
      <div
        className="network-badge"
        onClick={() => setOpen(!open)}
      >
        <span className="network-dot" />
        <span>{activeNetwork.name}</span>
        <span>▾</span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "#16213e",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 4,
            minWidth: 180,
            zIndex: 50,
          }}
        >
          {networks.map((network) => (
            <div
              key={network.chainId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 6,
                cursor: "pointer",
                background:
                  network.chainId === activeChainId ? "#0f3460" : "transparent",
              }}
              onClick={() => {
                console.log("[NetworkSwitcher] Switching to chainId:", network.chainId)
                setActiveNetwork(network.chainId)
                setOpen(false)
              }}
            >
              <span
                className="network-dot"
                style={{
                  background:
                    network.chainId === activeChainId ? "#e94560" : "#4ade80",
                }}
              />
              <span style={{ fontSize: 13 }}>{network.name}</span>
            </div>
          ))}
          <div
            style={{
              borderTop: "1px solid #333",
              marginTop: 4,
              paddingTop: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 6,
                cursor: "pointer",
                color: "#e94560",
                fontWeight: 500,
              }}
              onClick={() => {
                setOpen(false)
                onAddNetwork()
              }}
            >
              <span>＋</span>
              <span style={{ fontSize: 13 }}>添加网络</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
