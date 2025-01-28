"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { ethers } from "ethers"
import { useToast } from "@/components/ui/use-toast"

interface WalletContextType {
  address: string | null
  balance: string | null
  connect: () => Promise<void>
  disconnect: () => void
  provider: ethers.providers.Web3Provider | null
  signer: ethers.Signer | null
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  balance: null,
  connect: async () => {},
  disconnect: () => {},
  provider: null,
  signer: null,
})

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const { toast } = useToast()

  const connect = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" })
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()
        const address = await signer.getAddress()
        const balance = ethers.utils.formatEther(await provider.getBalance(address))

        setProvider(provider)
        setSigner(signer)
        setAddress(address)
        setBalance(balance)

        toast({
          title: "Wallet Connected",
          description: "Your wallet has been successfully connected!",
        })
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: "Failed to connect wallet. Please try again.",
        })
      }
    } else {
      toast({
        variant: "destructive",
        title: "MetaMask Required",
        description: "Please install MetaMask to use this feature.",
      })
    }
  }

  const disconnect = () => {
    setProvider(null)
    setSigner(null)
    setAddress(null)
    setBalance(null)
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    })
  }

  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", () => {
        disconnect()
      })
      window.ethereum.on("chainChanged", () => {
        disconnect()
      })
    }
    return () => {
      if (typeof window.ethereum !== "undefined") {
        window.ethereum.removeAllListeners()
      }
    }
  }, [disconnect]) // Added disconnect to dependencies

  return (
    <WalletContext.Provider value={{ address, balance, connect, disconnect, provider, signer }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)

