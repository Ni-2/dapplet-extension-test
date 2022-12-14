import { initBGFunctions } from 'chrome-extension-message-wrapper'
import cn from 'classnames'
import React, { useState } from 'react'
import { browser } from 'webextension-polyfill-ts'
import { resources } from '../../../common/resources'
import { IConnectedAccountUser } from '../../../common/types'
import styles from './ConnectedAccountsModal.module.scss'
import { Modal } from './modal'

const UserButton = ({ user }: { user: IConnectedAccountUser }) => {
  return (
    <div
      className={cn(styles.account, {
        [styles.nameUserActive]: user.accountActive,
      })}
    >
      <img src={resources[user.origin].icon} className={styles.imgUser} />
      <h4 className={styles.nameUser}>{user.name}</h4>
    </div>
  )
}

interface IConnectedAccountsModalProps {
  data: {
    accountsToConnect?: [IConnectedAccountUser, IConnectedAccountUser]
    accountsToDisconnect?: [IConnectedAccountUser, IConnectedAccountUser]
    accountToChangeStatus?: IConnectedAccountUser
    condition?: boolean
    frameId: string
  }
  onCloseClick: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bus: any
}

const ConnectedAccountsModal = (props: IConnectedAccountsModalProps) => {
  const { data, onCloseClick, bus } = props
  const { accountsToConnect, accountsToDisconnect, accountToChangeStatus, condition } = data

  const [isWaiting, setIsWaiting] = useState(false)

  const handleConnectOrDisconnect = async (
    firstAccount: IConnectedAccountUser,
    secondAccount: IConnectedAccountUser,
    isUnlink: boolean
  ) => {
    const { getConnectedAccountsMinStakeAmount, requestConnectingAccountsVerification } =
      await initBGFunctions(browser)
    const minStakeAmount: number = await getConnectedAccountsMinStakeAmount()
    const firstProofUrl = resources[firstAccount.origin].proofUrl(firstAccount.name)
    const secondProofUrl = resources[secondAccount.origin].proofUrl(secondAccount.name)
    const requestBody = {
      firstAccountId: firstAccount.name,
      firstOriginId: firstAccount.origin,
      secondAccountId: secondAccount.name,
      secondOriginId: secondAccount.origin,
      firstProofUrl,
      secondProofUrl,
      isUnlink,
    }

    let requestId: number
    try {
      setIsWaiting(true)
      requestId = await requestConnectingAccountsVerification(requestBody, minStakeAmount)
    } catch (err) {
      if (err.message !== 'User rejected the transaction.')
        console.log('Error in requestConnectingAccountsVerification().', err)
    }

    setIsWaiting(false)
    const frameId = data.frameId
    bus.publish('ready', [frameId, { requestId }])
    onCloseClick()
  }

  const handleSetMainAccount = async (account: IConnectedAccountUser) => {
    const { changeConnectedAccountStatus } = await initBGFunctions(browser)

    try {
      setIsWaiting(true)
      await changeConnectedAccountStatus(account.name, account.origin, !account.accountActive)
    } catch (err) {
      if (err.message !== 'User rejected the transaction.')
        console.log('Error in changeConnectedAccountStatus().', err)
    }

    setIsWaiting(false)
    const frameId = data.frameId
    bus.publish('ready', [frameId, 'ok'])
    onCloseClick()
  }

  const getTitle = ([firstAccount, secondAccount]: IConnectedAccountUser[]) =>
    resources[firstAccount.origin].type === 'social'
      ? resources[firstAccount.origin].title
      : resources[secondAccount.origin].title

  const socialNetworkToConnect =
    (accountsToConnect || accountsToDisconnect) &&
    getTitle(accountsToConnect || accountsToDisconnect)

  return (
    <>
      {!!accountsToConnect && (
        <Modal
          isWaiting={isWaiting}
          title="Do you want to connect these accounts?"
          accounts={
            <>
              <UserButton user={accountsToConnect[0]} />
              <UserButton user={accountsToConnect[1]} />
            </>
          }
          onClose={onCloseClick}
          onConfirm={async () => {
            await handleConnectOrDisconnect(accountsToConnect[0], accountsToConnect[1], false)
          }}
          onConfirmLabel="Connect"
        />
      )}
      {!!accountsToDisconnect && (
        <Modal
          isWaiting={isWaiting}
          title="Do you want to disconnect these accounts?"
          accounts={
            <>
              <UserButton user={accountsToDisconnect[0]} />
              <UserButton user={accountsToDisconnect[1]} />
            </>
          }
          onClose={onCloseClick}
          onConfirm={async () => {
            await handleConnectOrDisconnect(accountsToDisconnect[0], accountsToDisconnect[1], true)
          }}
          onConfirmLabel="Disconnect"
        />
      )}
      {!!accountToChangeStatus && (
        <Modal
          isWaiting={isWaiting}
          title={
            accountToChangeStatus.accountActive
              ? 'Set this account to non-main?"'
              : 'Select this account as main?'
          }
          accounts={<UserButton user={accountToChangeStatus} />}
          content={
            accountToChangeStatus.accountActive
              ? ''
              : 'This will allow you to display your username instead of a standard ID in our ecosystem.'
          }
          onClose={onCloseClick}
          onConfirm={async () => {
            await handleSetMainAccount(accountToChangeStatus)
          }}
          onConfirmLabel="Confirm"
        />
      )}
      {condition && (
        <Modal
          isWaiting={isWaiting}
          title={'Add your NEAR account ID'}
          content={`Add your NEAR account ID to your ${socialNetworkToConnect} username. This is done so the Oracle can confirm your ownership of the ${socialNetworkToConnect} account`}
          onClose={onCloseClick}
          onConfirm={async () => {
            const frameId = data.frameId
            bus.publish('ready', [frameId, 'ok'])
            onCloseClick()
          }}
          onConfirmLabel="Already done"
        />
      )}
    </>
  )
}

export default ConnectedAccountsModal
