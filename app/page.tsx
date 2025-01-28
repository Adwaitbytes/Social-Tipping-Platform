"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Wallet, Send, UserPlus, PiggyBank, RefreshCw } from "lucide-react"

// Contract configuration
const CONTRACT_ADDRESS = "0x5B731B6DFC1E32833CCD4BAFB337e8A967df904b"
const CONTRACT_ABI = [
  "function registerCreator() external",
  "function tipCreator(address creator) external payable",
  "function withdrawTips() external",
  "function getCreatorBalance(address creator) external view returns (uint256)",
]

// Supported network configurations
const SUPPORTED_NETWORKS = {
  1: "Ethereum Mainnet",
  5: "Goerli Testnet",
  11155111: "Sepolia Testnet",
}

export default function Home() {
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [tipAmount, setTipAmount] = useState<string>("")
  const [creatorAddress, setCreatorAddress] = useState<string>("")
  const [balance, setBalance] = useState<string>("0")
  const { toast } = useToast()

  const initializeEthers = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        variant: "destructive",
        title: "MetaMask Required",
        description: "Please install MetaMask to use this application.",
      })
      return null
    }

    try {
      setLoading(true)
      await window.ethereum.request({ method: "eth_requestAccounts" })
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const network = await provider.getNetwork()

      if (!SUPPORTED_NETWORKS[network.chainId]) {
        toast({
          variant: "destructive",
          title: "Unsupported Network",
          description: `Please switch to a supported network (${Object.values(SUPPORTED_NETWORKS).join(", ")})`,
        })
        setLoading(false)
        return null
      }

      const signer = provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      const address = await signer.getAddress()

      setProvider(provider)
      setContract(contract)
      setAddress(address)

      toast({
        title: "Wallet Connected",
        description: "Your wallet has been successfully connected!",
      })

      return { provider, contract, address }
    } catch (error: any) {
      console.error("Failed to initialize Ethers:", error)
      toast({
        variant: "destructive",
        title: "Initialization Failed",
        description: error.message || "Failed to initialize. Please try again.",
      })
      setLoading(false)
      return null
    }
  }, [toast])

  const updateBalance = useCallback(async () => {
    if (contract && address) {
      try {
        const balance = await contract.getCreatorBalance(address)
        setBalance(ethers.utils.formatEther(balance))
      } catch (error) {
        console.error("Failed to fetch balance:", error)
      }
    }
  }, [contract, address])

  useEffect(() => {
    if (address) {
      updateBalance()
    }
  }, [address, updateBalance])

  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        setAddress(null)
        setContract(null)
        setProvider(null)
      } else {
        // User switched accounts
        setAddress(accounts[0])
      }
    }

    const handleChainChanged = () => {
      window.location.reload()
    }

    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)
    }

    return () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [])

  const handleConnectWallet = async () => {
    setLoading(true)
    await initializeEthers()
    setLoading(false)
  }

  const handleRegisterCreator = async () => {
    if (!contract) return
    try {
      setLoading(true)
      const tx = await contract.registerCreator()
      await tx.wait()
      toast({
        title: "Registration Successful",
        description: "You are now registered as a creator!",
      })
      updateBalance()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Failed to register as creator.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTipCreator = async () => {
    if (!contract || !tipAmount || !creatorAddress) return
    try {
      setLoading(true)
      const tx = await contract.tipCreator(creatorAddress, {
        value: ethers.utils.parseEther(tipAmount),
      })
      await tx.wait()
      toast({
        title: "Tip Sent",
        description: `Successfully sent ${tipAmount} ETH to creator!`,
      })
      setTipAmount("")
      setCreatorAddress("")
      updateBalance()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Tip Failed",
        description: error.message || "Failed to send tip.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawTips = async () => {
    if (!contract) return
    try {
      setLoading(true)
      const tx = await contract.withdrawTips()
      await tx.wait()
      toast({
        title: "Withdrawal Successful",
        description: "Successfully withdrew your tips!",
      })
      updateBalance()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Withdrawal Failed",
        description: error.message || "Failed to withdraw tips.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCheckBalance = async () => {
    try {
      setLoading(true)
      await updateBalance()
      toast({
        title: "Balance Updated",
        description: `Your current balance is ${balance} ETH`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Balance Check Failed",
        description: error.message || "Failed to check balance.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary py-12 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-center">Social Tipping Platform</CardTitle>
            <CardDescription className="text-center">
              Support your favorite content creators with ETH tips
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              {!address ? (
                <Button onClick={handleConnectWallet} size="lg" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                  Connect Wallet
                </Button>
              ) : (
                <Button variant="outline" size="lg">
                  Connected: {address.slice(0, 6)}...{address.slice(-4)}
                </Button>
              )}
            </div>

            <AnimatePresence>
              {address && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <p className="text-lg font-semibold">Your Balance: {balance} ETH</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={handleRegisterCreator}
                      disabled={loading}
                      className="flex items-center justify-center"
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="mr-2 h-4 w-4" />
                      )}
                      Register as Creator
                    </Button>
                    <Button
                      onClick={handleCheckBalance}
                      disabled={loading}
                      variant="secondary"
                      className="flex items-center justify-center"
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Refresh Balance
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Creator Address (0x...)"
                      value={creatorAddress}
                      onChange={(e) => setCreatorAddress(e.target.value)}
                      disabled={loading}
                    />
                    <Input
                      type="number"
                      placeholder="Tip Amount (ETH)"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      disabled={loading}
                      min="0"
                      step="0.01"
                    />
                    <Button
                      onClick={handleTipCreator}
                      disabled={loading || !tipAmount || !creatorAddress}
                      className="w-full"
                    >
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Send Tip
                    </Button>
                  </div>

                  <Button onClick={handleWithdrawTips} disabled={loading} variant="outline" className="w-full">
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PiggyBank className="mr-2 h-4 w-4" />
                    )}
                    Withdraw Tips
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

