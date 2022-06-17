import { initBGFunctions } from 'chrome-extension-message-wrapper'
import makeBlockie from 'ethereum-blockies-base64'
import React, { FC, useEffect, useState } from 'react'
import ReactTimeAgo from 'react-time-ago'
import { Button, Comment, Segment } from 'semantic-ui-react'
import { browser } from 'webextension-polyfill-ts'
import * as walletIcons from '../../../../../common/resources/wallets'

import * as EventBus from '../../../../../common/global-event-bus'
import { CheckIcon } from '../../../../../common/react-components/CheckIcon'
import {
  ChainTypes,
  DefaultSigners,
  WalletDescriptor,
  WalletTypes,
} from '../../../../../common/types'
export interface WalletProps {
  isOverlay?: boolean
  handleWalletConnect?: () => void
  handleWalletLengthConnect?: () => void
}
let _isMounted = false
export const Wallet: FC<WalletProps> = (props: WalletProps) => {
  const { isOverlay, handleWalletLengthConnect, handleWalletConnect } = props
  const [descriptors, setDescriptors] = useState<WalletDescriptor[]>([])
  const [loading, setLoading] = useState(true)

  const connectedDescriptors = descriptors.filter((x) => x.connected)
  useEffect(() => {
    const init = async () => {
      refresh()
      _isMounted = true
      EventBus.on('wallet_changed', refresh)
    }

    init()

    return () => {
      _isMounted = false
      EventBus.off('wallet_changed', refresh)
    }
  }, [])
  const refresh = async () => {
    const { getWalletDescriptors } = await initBGFunctions(browser)

    const descriptors = await getWalletDescriptors()

    if (_isMounted) {
      setDescriptors(descriptors)
      setLoading(false)
    }
  }

  const disconnectButtonClick = async (chain: ChainTypes, wallet: WalletTypes) => {
    const { disconnectWallet } = await initBGFunctions(browser)
    await disconnectWallet(chain, wallet)
  }

  const connectWallet = async () => {
    const { pairWalletViaOverlay } = await initBGFunctions(browser)
    if (isOverlay) {
      // handleWalletConnect()
      await pairWalletViaOverlay(null, DefaultSigners.EXTENSION, null)
      // await this.componentDidMount()
      handleWalletLengthConnect()
    } else {
      // handleWalletConnect()
      pairWalletViaOverlay(null, DefaultSigners.EXTENSION, null)
      window.close()
      handleWalletLengthConnect()
    }
  }
  const setWalletFor = async (type: string) => {
    const { setWalletFor } = await initBGFunctions(browser)
    await setWalletFor(type, DefaultSigners.EXTENSION, ChainTypes.ETHEREUM_GOERLI)
  }
  if (loading) return null

  return (
    <React.Fragment>
      <Segment
        className={isOverlay ? undefined : 'internalTab'}
        style={{ marginTop: isOverlay ? 0 : undefined }}
      >
        {connectedDescriptors.length > 0 ? (
          <Comment.Group>
            {connectedDescriptors.map((x, i) => (
              <div
                key={i}
                style={{
                  marginBottom: '10px',
                  display: 'flex',
                  boxShadow: '0 0 0 1px rgba(34,36,38,.15) inset',
                  borderRadius: '.28571429rem',
                  padding: '.78571429em 1.5em .78571429em',
                }}
              >
                {x.account ? (
                  <img
                    src={makeBlockie(x.account)}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '4px',
                      margin: '2px 0',
                    }}
                  />
                ) : null}
                <div style={{ flex: 'auto', marginLeft: '10px' }}>
                  <div style={{ display: 'inline', color: 'rgba(0,0,0,.4)' }}>
                    {/* {(x.default) ? <Icon name='star' /> : <Icon link name='star outline' onClick={() => this.setWalletFor(x.type)} />} */}
                    {x.account ? (
                      <span title={x.account} style={{ color: '#000', fontWeight: 'bold' }}>
                        {x.account.length === 42
                          ? x.account.substr(0, 6) + '...' + x.account.substr(38)
                          : x.account}
                      </span>
                    ) : null}
                    <CheckIcon
                      text="Copied"
                      name="copy"
                      style={{ marginLeft: '4px' }}
                      onClick={() => navigator.clipboard.writeText(x.account)}
                    />
                  </div>
                  {/* <Comment.Author style={{ display: 'inline' }}>{x.account}</Comment.Author> */}
                  {/* <Icon link name='external' onClick={() => window.open(`https://${(x.chainId === 1) ? '' : networkName(x.chainId) + '.'}etherscan.io/address/${x.account}`, '_blank')} /> */}
                  <div>
                    {walletIcons[x.type] ? (
                      <img
                        style={{ width: '16px', position: 'relative', top: '3px' }}
                        src={walletIcons[x.type]}
                      />
                    ) : null}
                    {x.meta?.icon ? (
                      <img
                        style={{
                          width: '16px',
                          position: 'relative',
                          top: '3px',
                          marginLeft: '3px',
                        }}
                        src={x.meta.icon}
                      />
                    ) : null}
                    {x.lastUsage ? (
                      <span style={{ marginLeft: '6px', color: 'rgba(0,0,0,.4)' }}>
                        <ReactTimeAgo date={new Date(x.lastUsage)} locale="en-US" />
                      </span>
                    ) : null}
                    {/* <span style={{ marginLeft: '0.5em' }}>{networkName(x.chainId)}</span> */}
                  </div>
                </div>
                <div>
                  <Button
                    onClick={() => disconnectButtonClick(x.chain, x.type)}
                    size="tiny"
                    style={{ margin: '5px 0' }}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ))}
          </Comment.Group>
        ) : (
          <div style={{ marginBottom: '10px' }}>No connected wallets</div>
        )}

        <Button onClick={() => connectWallet()}>Connect</Button>
      </Segment>
    </React.Fragment>
  )
}
