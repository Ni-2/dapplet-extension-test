import { Provider, TransactionRequest } from '@ethersproject/providers'
import WalletConnect from '@walletconnect/client'
import { ethers } from 'ethers'
import { Deferrable } from 'ethers/lib/utils'
import { EthereumWallet } from './interface'

let walletconnect = new WalletConnect({
  bridge: 'https://bridge.walletconnect.org',
})

export default class extends ethers.Signer implements EthereumWallet {
  public provider: ethers.providers.JsonRpcProvider
  private _sendDataToPairingOverlay: (topic: string, args: any[]) => void

  constructor(config: {
    providerUrl: string
    sendDataToPairingOverlay: (topic: string, args: any[]) => void
  }) {
    super()
    this.provider = new ethers.providers.JsonRpcProvider(config.providerUrl)
    this._sendDataToPairingOverlay = config.sendDataToPairingOverlay
  }

  async getAddress(): Promise<string> {
    return Promise.resolve(
      walletconnect.accounts[0] || '0x0000000000000000000000000000000000000000'
    )
  }

  async signMessage(message: string | ethers.Bytes): Promise<string> {
    const address = await this.getAddress()
    return walletconnect.sendCustomRequest({
      method: 'personal_sign',
      params: [message, address.toLowerCase()],
    })
  }

  async signTransaction(transaction: Deferrable<TransactionRequest>): Promise<string> {
    throw new Error('Not implemented')
  }

  async sendTransaction(
    transaction: ethers.providers.TransactionRequest
  ): Promise<ethers.providers.TransactionResponse> {
    const txHash = await this.sendTransactionOutHash(transaction)

    // the wait of a transaction from another provider can be long
    let tx = null
    while (tx === null) {
      await new Promise((res) => setTimeout(res, 1000))
      tx = await this.provider.getTransaction(txHash)
    }

    return tx
  }

  async sendTransactionOutHash(transaction: ethers.providers.TransactionRequest): Promise<string> {
    await this._checkNetwork()
    transaction.from = await this.getAddress()
    const tx = await ethers.utils.resolveProperties(transaction)
    const txHash = await walletconnect.sendTransaction(tx as any)
    localStorage['walletconnect_lastUsage'] = new Date().toISOString()
    return txHash
  }

  async sendCustomRequest(method: string, params: any[]): Promise<any> {
    return walletconnect.sendCustomRequest({ method, params })
  }

  connect(provider: Provider): ethers.Signer {
    throw new Error('Method not implemented.')
  }

  async isAvailable() {
    return true
  }

  async isConnected() {
    return walletconnect.connected ?? false
  }

  async connectWallet({ overlayId }: { overlayId: string }): Promise<void> {
    if (walletconnect.connected) return
    walletconnect['_handshakeTopic'] = '' // ToDo: remove after update of WalletConnect to >1.3.1

    const callback = (err, payload) => {
      walletconnect.off('display_uri')
      if (err) throw err
      const [uri] = payload.params
      this._showQR(uri, overlayId)
    }

    walletconnect.on('display_uri', callback)
    await walletconnect.createSession()

    return new Promise((resolve, reject) => {
      walletconnect.on('connect', (error, payload) => {
        if (error) {
          reject(error)
        } else {
          localStorage['walletconnect_lastUsage'] = new Date().toISOString()
          resolve(payload)
        }
      })
    })
  }

  async disconnectWallet() {
    if (walletconnect.connected) {
      await walletconnect.killSession()
      delete localStorage['walletconnect']
      delete localStorage['walletconnect_lastUsage']
      walletconnect = null
    }
  }

  async getMeta() {
    const m = walletconnect.peerMeta
    return m
      ? {
          name: m.name,
          description: m.description,
          icon: m.icons[0],
        }
      : null
  }

  getLastUsage() {
    return localStorage['walletconnect_lastUsage']
  }

  private async _checkNetwork(): Promise<void> {
    const network = await this.provider.getNetwork()
    const chainId = await this._getWalletChainId()

    if (network.chainId !== chainId) {
      throw new Error(`Switch network to ${network.name} in the wallet`)
    }
  }

  private async _getWalletChainId(): Promise<number> {
    const chainId = await walletconnect.sendCustomRequest({
      method: 'eth_chainId',
      params: [],
    })
    return Number(chainId)
  }

  private async _showQR(uri: string, overlayId?: string) {
    this._sendDataToPairingOverlay('walletconnect', [uri, overlayId])
  }
}
