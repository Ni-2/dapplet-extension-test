import { initBGFunctions } from 'chrome-extension-message-wrapper'
import cn from 'classnames'
import React, { useEffect, useState } from 'react'
import { browser } from 'webextension-polyfill-ts'
import { Message } from '../../components/Message'
import Attention from './assets/attention.svg'
import Ok from './assets/ok.svg'
import Time from './assets/time.svg'
import styles from './ConnectedAccount.module.scss'
import { IPair, IUser, Status } from './types'

const UserButton = ({
  user,
  handleOpenPopup,
}: {
  user: IUser
  handleOpenPopup: (account: IUser) => Promise<void>
}) => {
  return (
    <div
      className={cn(styles.account, {
        [styles.nameUserActive]: user.accountActive,
      })}
      onClick={() => handleOpenPopup(user)}
    >
      <img src={user.img} className={styles.imgUser} />
      <h4 className={styles.nameUser}>{user.name}</h4>
    </div>
  )
}

export const ConnectedAccount = () => {
  const [pairs, setPairs] = useState<IPair[]>([])

  const updatePairs = async (prevPairs?: IPair[]) => {
    const { getConnectedAccountsPairs } = await initBGFunctions(browser)
    const newPairs: IPair[] = await getConnectedAccountsPairs({ prevPairs })
    setPairs(newPairs)

    // *** UPDATE ***
    if (!newPairs || newPairs.length === 0) return
    const processingAccountIdsPairs = newPairs.filter((p) => p.statusName === Status.Processing)
    if (processingAccountIdsPairs.length > 0) {
      await new Promise((res) => setTimeout(res, 5000))
      updatePairs(newPairs)
    }
  }

  useEffect(() => {
    updatePairs()
  }, [])

  const handleOpenPopup = async (account: IUser) => {
    const { openConnectedAccountsPopup, getThisTab } = await initBGFunctions(browser)
    const thisTab = await getThisTab()
    try {
      await openConnectedAccountsPopup({ accountToChangeStatus: account }, thisTab.id)
      updatePairs()
    } catch (err) {
      console.log('ERROR in openConnectedAccountsPopup():', err)
    }
  }

  const handleDisconnectAccounts = async (pair: IPair) => {
    const { openConnectedAccountsPopup, getThisTab } = await initBGFunctions(browser)
    const thisTab = await getThisTab()
    try {
      await openConnectedAccountsPopup(
        {
          accountsToDisconnect: [pair.firstAccount, pair.secondAccount],
        },
        thisTab.id
      )
      updatePairs()
    } catch (err) {
      console.log('ERROR in openConnectedAccountsPopup():', err)
    }
  }

  return (
    <div className={cn(styles.wrapper)}>
      <div className={styles.title}>
        <h3>Accounts</h3>
        <h3>Status</h3>
      </div>
      {!pairs || pairs.length === 0 ? (
        <Message
          className={styles.messageDelete}
          title={'There are no connected accounts'}
          subtitle={'Use Connecting Accounts dapplet to connect your accounts'}
        />
      ) : (
        <div className={styles.accountsWrapper}>
          {pairs.map((x, i) => {
            const statusLabel =
              x.statusName === Status.Connected
                ? Ok
                : x.statusName === Status.Processing
                ? Time
                : Attention
            return (
              <div key={i} className={styles.mainBlock}>
                <div
                  className={cn(
                    styles.accountBlock,
                    (x.firstAccount.name + x.secondAccount.name).length > 30
                      ? styles.accountBlockVertical
                      : styles.accountBlockHorizontal
                  )}
                >
                  <UserButton user={x.firstAccount} handleOpenPopup={handleOpenPopup} />
                  <span className={styles.arrowsAccount} />
                  <UserButton user={x.secondAccount} handleOpenPopup={handleOpenPopup} />
                </div>
                <div data-title={x.statusMessage} className={cn(styles.accountStatus)}>
                  <img
                    src={statusLabel}
                    className={cn(styles.statusLabel, {
                      [styles.statusConnected]: x.statusName === Status.Connected,
                      [styles.statusProcessing]: x.statusName === Status.Processing,
                      [styles.statusError]: x.statusName === Status.Error,
                    })}
                    alt={x.statusMessage}
                  />
                </div>
                <div className={cn(styles.accountDelete)}>
                  <button
                    type="button"
                    onClick={() => handleDisconnectAccounts(x)}
                    className={styles.buttonDelete}
                    disabled={x.closeness > 1 || x.statusName !== Status.Connected}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
