import { baseDecode } from 'borsh'
import * as nearAPI from 'near-api-js'
import { ConnectedWalletAccount } from 'near-api-js'
import browser from 'webextension-polyfill'
import { generateGuid } from '../../../../common/generateGuid'
import { waitTab } from '../../../../common/helpers'

export class CustomConnectedWalletAccount extends ConnectedWalletAccount {
  async signAndSendTransaction(
    receiverId: string,
    actions: nearAPI.transactions.Action[]
  ): Promise<nearAPI.providers.FinalExecutionOutcome> {
    if (!this.accountId) throw new Error('this.accountId is undefined')
    const localKey = await this.connection.signer.getPublicKey(
      this.accountId,
      this.connection.networkId
    )
    let accessKey = await this.accessKeyForTransaction(receiverId, actions, localKey)
    if (!accessKey) {
      throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`)
    }

    if (localKey && localKey.toString() === accessKey.public_key) {
      try {
        return await super.signAndSendTransaction(receiverId, actions)
      } catch (e) {
        if (e.type === 'NotEnoughBalance') {
          accessKey = await this.accessKeyForTransaction(receiverId, actions)
        } else {
          throw e
        }
      }
    }

    const block = await this.connection.provider.block({ finality: 'final' })
    const blockHash = baseDecode(block.header.hash)

    const publicKey = nearAPI.utils.PublicKey.from(accessKey.public_key)
    // TODO: Cache & listen for nonce updates for given access key
    const nonce = accessKey.access_key.nonce + 1
    const transaction = nearAPI.transactions.createTransaction(
      this.accountId,
      publicKey,
      receiverId,
      nonce,
      actions,
      blockHash
    )

    const requestId = generateGuid()
    const callbackUrl = browser.runtime.getURL(`callback.html?request_id=${requestId}`)

    const [currentTab] = await browser.tabs.query({ active: true, currentWindow: true })

    let callbackTab = null
    const waitTabPromise = waitTab(callbackUrl).then((x) => (callbackTab = x))
    const requestPromise = this.walletConnection.requestSignTransactions([transaction], callbackUrl)

    await Promise.race([waitTabPromise, requestPromise])

    if (!callbackTab) throw new Error(`User rejected the transaction.`)

    await browser.tabs.update(currentTab.id, { active: true })
    await browser.tabs.remove(callbackTab.id)

    const callbackTabUrlObject = new URL(callbackTab.url)
    const transactionHashes = callbackTabUrlObject.searchParams.get('transactionHashes')
    const errorCode = callbackTabUrlObject.searchParams.get('errorCode')

    if (errorCode || !transactionHashes) {
      throw new Error(`User rejected the transaction.`)
    }

    const txHash = baseDecode(transactionHashes)
    const txStatus = await this.walletConnection._near.connection.provider.txStatus(
      txHash,
      this.accountId
    )

    return txStatus

    // TODO: Aggregate multiple transaction request with "debounce".
    // TODO: Introduce TrasactionQueue which also can be used to watch for status?
  }
}
