import React, { ReactElement, useState, useEffect, useMemo, FC } from 'react'
import cn from 'classnames'
import styles from './Settings.module.scss'
import {
  isValidHttp,
  isValidUrl,
  isValidPostageStampId,
} from '../../../../../popup/helpers'
import { browser } from 'webextension-polyfill-ts'
import { initBGFunctions } from 'chrome-extension-message-wrapper'
import { useToggle } from '../../hooks/useToggle'

import { SettingTitle } from '../../components/SettingTitle'
import { SettingItem } from '../../components/SettingItem'
import { Switch } from '../../components/Switch'
import { Dropdown } from '../../components/Dropdown'
import { SettingWrapper } from '../../components/SettingWrapper'
import { Checkbox } from '../../components/Checkbox'
import { InputPanel } from '../../components/InputPanel'
import { DropdownRegistery } from '../../components/DropdownRegistery'
import { DropdownTrustedUsers } from '../../components/DropdownTrustedUsers'
import { DropdownPreferedOverlayStorage } from '../../components/DropdownPreferedOverlayStorage'
import { StorageTypes } from '../../../../../common/constants'

export const DROPDOWN_LIST = [{ _id: '0', label: 'Custom' }]
let _isMounted = false
export interface SettingsListProps {
  devModeProps: boolean
  setDevMode: (x) => void
  errorReporting: boolean
  setErrorReporting: (x) => void
}
export const SettingsList: FC<SettingsListProps> = (props) => {
  const { devModeProps, setDevMode, errorReporting, setErrorReporting } = props
  const [isUpdateAvailable, onUpdateAvailable] = useState(false)

  const [providerInput, setProviderInput] = useState('')
  const [providerEdited, setProviderEdited] = useState(false)
  const [providerInputError, setProviderInputError] = useState(null)
  const [providerLoading, setProviderLoading] = useState(false)

  const [swarmGatewayInput, setSwarmGatewayInput] = useState('')
  const [swarmGatewayInputError, setSwarmGatewayInputError] = useState(null)
  const [swarmGatewayEdited, setSwarmGatewayEdited] = useState(false)
  const [swarmGatewayLoading, setSwarmGatewayLoading] = useState(false)

  const [swarmPostageStampIdInput, setSwarmPostageStampIdInput] = useState('')
  const [swarmPostageStampIdInputError, setSwarmPostageStampIdInputError] =
    useState(null)
  const [swarmPostageStampIdInputEdited, setSwarmPostageStampIdInputEdited] =
    useState(false)
  const [swarmPostageStampIdLoading, setSwarmPostageStampIdLoading] =
    useState(false)

  const [dynamicAdapterInput, setDynamicAdapterInput] = useState('')
  const [dynamicAdapterInputError, setDynamicAdapterInputError] = useState(null)
  const [dynamicAdapterInputEdited, setDynamicAdapterInputEdited] =
    useState(false)

  const [registryInput, setRegistryInput] = useState('')
  const [registryInputError, setRegistryInputError] = useState(null)
  const [registries, setRegistries] = useState([])

  const [userAgentNameInput, setUserAgentNameInput] = useState('')
  const [userAgentId, setUserAgentID] = useState('')
  const [userAgentNameInputError, setUserAgentNameInputError] = useState(null)
  const [userAgentNameLoading, setUserAgentNameLoading] = useState(false)
  const [userAgentNameEdited, setUserAgentNameEdited] = useState(false)

  const [ipfsGatewayInput, setIpfsGatewayInput] = useState('')
  const [ipfsGatewayInputError, setIpfsGatewayInputError] = useState(null)
  const [ipfsGatewayLoading, setIpfsGatewayLoading] = useState(false)
  const [ipfsGatewayEdited, setIpfsGatewayEdited] = useState(false)

  const [siaPortalInput, setSiaPortalInput] = useState('')
  const [siaPortalInputError, setSiaPortalInputError] = useState(null)
  const [siaPortalLoading, setSiaPortalLoading] = useState(false)
  const [siaPortalEdited, setSiaPortalEdited] = useState(false)

  const [targetStorages, setTargetStorages] = useState<string[]>([
    StorageTypes.Swarm,
    StorageTypes.Sia,
    StorageTypes.Ipfs,
  ])

  useEffect(() => {
    _isMounted = true
    const init = async () => {
      await checkUpdates()
      await loadDevMode()
      await loadProvider()
      await loadSwarmGateway()
      await loadErrorReporting()
      await loadSwarmPostageStampId()
      await loadDynamicAdapter()
      // await loadRegistries()
      await loadUserAgentId()
      await loadUserAgentName()
      await loadIpfsGateway()
      await loadSiaPortal()
    }
    init()
    return () => {
      _isMounted = false
    }
  }, [])
  const loadDevMode = async () => {
    const { getDevMode } = await initBGFunctions(browser)
    const devMode = await getDevMode()
    setDevMode(devMode)
  }
  const loadErrorReporting = async () => {
    const { getErrorReporting } = await initBGFunctions(browser)
    const errorReporting = await getErrorReporting()
    setErrorReporting(errorReporting)
  }
  const checkUpdates = async () => {
    const { getNewExtensionVersion } = await initBGFunctions(browser)
    const isUpdateAvailable = await getNewExtensionVersion()
    onUpdateAvailable(isUpdateAvailable)
  }
  const loadProvider = async () => {
    const { getEthereumProvider } = await initBGFunctions(browser)
    const provider = await getEthereumProvider()
    setProviderInput(provider)
  }
  const setProvider = async (provider: string) => {
    try {
      setProviderLoading(true)

      const { setEthereumProvider } = await initBGFunctions(browser)
      await setEthereumProvider(provider)
      loadProvider()
      setProviderLoading(false)
      setProviderEdited(false)
    } catch (err) {
      setProviderLoading(false)
      setProviderEdited(false)
      setProviderInputError(err.message)
    }
  }

  const loadSwarmGateway = async () => {
    const { getSwarmGateway } = await initBGFunctions(browser)
    const gateway = await getSwarmGateway()
    setSwarmGatewayInput(gateway)
  }

  const setSwarmGateway = async (gateway: string) => {
    try {
      setSwarmGatewayLoading(true)
      const { setSwarmGateway } = await initBGFunctions(browser)
      await setSwarmGateway(gateway)
      loadSwarmGateway()
      setSwarmGatewayEdited(false)
      setSwarmGatewayLoading(false)
    } catch (err) {
      setSwarmGatewayEdited(false)
      setSwarmGatewayLoading(false)
      setSwarmGatewayInputError(err.message)
    }
  }

  const loadSwarmPostageStampId = async () => {
    const { getSwarmPostageStampId } = await initBGFunctions(browser)
    const id = await getSwarmPostageStampId()
    setSwarmPostageStampIdInput(id)
  }

  const setSwarmPostageStampId = async (id: string) => {
    try {
      setSwarmPostageStampIdLoading(true)

      const { setSwarmPostageStampId } = await initBGFunctions(browser)
      await setSwarmPostageStampId(id)
      loadSwarmPostageStampId()
      setSwarmPostageStampIdLoading(false)
      setSwarmPostageStampIdInputEdited(false)
    } catch (err) {
      setSwarmPostageStampIdLoading(false)
      setSwarmPostageStampIdInputEdited(false)
      setSwarmPostageStampIdInputError(err.message)
    }
  }

  const loadDynamicAdapter = async () => {
    const { getDynamicAdapter } = await initBGFunctions(browser)
    const dynamicAdapterInput = await getDynamicAdapter()

    setDynamicAdapterInput(dynamicAdapterInput)
  }

  const setDynamicAdapter = async (dynamicAdapter: string) => {
    try {
      const { setDynamicAdapter } = await initBGFunctions(browser)
      await setDynamicAdapter(dynamicAdapter)

      setDynamicAdapterInputEdited(false)
    } catch (error) {
      setDynamicAdapterInputError(error.message)
      console.log(dynamicAdapterInputError)
    }
  }
  // const loadRegistries = async () => {
  //   const { getRegistries } = await initBGFunctions(browser)
  //   const registries = await getRegistries()

  //   setRegistries(registries.filter((r) => r.isDev === false))
  // }

  const loadUserAgentId = async () => {
    const { getUserAgentId } = await initBGFunctions(browser)
    const userAgentId = await getUserAgentId()

    setUserAgentID(userAgentId)
  }

  const loadUserAgentName = async () => {
    const { getUserAgentName } = await initBGFunctions(browser)
    const userAgentNameInput = await getUserAgentName()

    setUserAgentNameInput(userAgentNameInput)
  }

  const setUserAgentName = async (userAgentName: string) => {
    setUserAgentNameLoading(true)
    const { setUserAgentName } = await initBGFunctions(browser)
    await setUserAgentName(userAgentName)
    loadUserAgentName()
    setUserAgentNameLoading(false)
    setUserAgentNameEdited(false)
  }

  const loadIpfsGateway = async () => {
    const { getIpfsGateway } = await initBGFunctions(browser)
    const gateway = await getIpfsGateway()
    setIpfsGatewayInput(gateway)
  }

  const setIpfsGateway = async (gateway: string) => {
    try {
      setIpfsGatewayLoading(true)
      const { setIpfsGateway } = await initBGFunctions(browser)
      await setIpfsGateway(gateway)
      loadSwarmGateway()
      setIpfsGatewayLoading(false)
      setIpfsGatewayEdited(false)
    } catch (err) {
      setIpfsGatewayLoading(false)
      setIpfsGatewayEdited(false)
      setIpfsGatewayInputError(err.message)
    }
  }

  const loadSiaPortal = async () => {
    const { getSiaPortal } = await initBGFunctions(browser)
    const gateway = await getSiaPortal()
    setSiaPortalInput(gateway)
  }

  const setSiaPortal = async (gateway: string) => {
    try {
      setSiaPortalLoading(true)

      const { setSiaPortal } = await initBGFunctions(browser)
      await setSiaPortal(gateway)
      loadSiaPortal()
      setSiaPortalLoading(false)
      setSiaPortalEdited(false)
    } catch (err) {
      setSiaPortalLoading(false)
      setSiaPortalEdited(false)
      setSiaPortalInputError(err.message)
    }
  }
  const changeTargetStorage = (storage: StorageTypes, checked: boolean) => {
    const targetStoragesChecked = targetStorages.filter((x) => x !== storage)
    if (checked) targetStorages.push(storage)
    setTargetStorages(targetStoragesChecked)
  }
  // setProvider(providerInput)
  // setSwarmGateway(swarmGatewayInput)
  // setSwarmPostageStampId(swarmPostageStampIdInput)
  // setDynamicAdapter(dynamicAdapterInput)
  // setIpfsGateway(ipfsGatewayInput)
  return (
    <div className={styles.blockSettings}>
      <div className={styles.scrollBlock}>
        <SettingWrapper
          title="Social"
          children={
            <>
              <SettingItem
                title="Version"
                component={
                  <div className={styles.version}>
                    <span className={styles.versionTitle}>
                      {EXTENSION_VERSION}
                    </span>
                    {isUpdateAvailable ? (
                      <button
                        className={styles.versionButton}
                        onClick={() =>
                          window.open(
                            `https://github.com/dapplets/dapplet-extension/releases`,
                            '_blank'
                          )
                        }
                      >
                        Update
                      </button>
                    ) : null}
                  </div>
                }
              />
              <SettingItem
                title="Trusted Users"
                component={<></>}
                children={<DropdownTrustedUsers />}
              />
              {/* Todo : on Parameters */}
              <SettingItem
                title="Developer mode"
                component={
                  <Switch
                    checked={devModeProps}
                    onChange={() => setDevMode(!devModeProps)}
                  />
                }
              />
              <SettingItem
                title="Bug reports"
                component={
                  <Switch
                    checked={errorReporting}
                    onChange={() => setErrorReporting(!errorReporting)}
                  />
                }
              />
              <SettingItem
                title="User Agent Name"
                component={<></>}
                children={
                  <InputPanel
                    value={userAgentNameInput}
                    placeholder="http:\\bee.dapplets.org\"
                    onChange={(e) => {
                      setUserAgentName(e.target.value)
                      // setUserAgentNameInput(e.target.value)
                      setUserAgentNameEdited(true)
                      setUserAgentNameInputError(null)
                    }}
                    isVisibleButton={false}
                  />
                }
              />
            </>
          }
        />

        <SettingWrapper
          title="Parameters"
          children={
            <>
              <SettingItem
                title="Regestries"
                component={<></>}
                children={<DropdownRegistery />}
              />
              <SettingItem
                title="Dynamic Adapter"
                component={<></>}
                children={
                  <InputPanel
                    error={!!dynamicAdapterInputError}
                    onChange={(e) => {
                      // setDynamicAdapter(e.target.value)
                      setDynamicAdapter(e.target.value)
                      setDynamicAdapterInputError(null)
                      setDynamicAdapterInputEdited(true)
                    }}
                    value={dynamicAdapterInput}
                    placeholder="dynamic-adapter.dapplet-base.eth#default@..."
                  />
                }
              />
              <SettingItem
                title="Prefered Overlay Storage"
                component={<></>}
                children={<DropdownPreferedOverlayStorage />}
              />
              <SettingItem
                title="Storages"
                component={<></>}
                children={
                  <div className={styles.checkboxBlock}>
                    <Checkbox isCheckbox title="Centralized" />
                    <Checkbox
                      isCheckbox={targetStorages.includes(StorageTypes.Sia)}
                      title="SIA"
                      onChange={(e) =>
                        changeTargetStorage(StorageTypes.Sia, !e)
                      }
                    />
                    <Checkbox
                      isCheckbox={targetStorages.includes(StorageTypes.Ipfs)}
                      title="IPFS"
                      onChange={(e) =>
                        changeTargetStorage(StorageTypes.Ipfs, !e)
                      }
                    />
                    <Checkbox
                      isCheckbox={targetStorages.includes(StorageTypes.Swarm)}
                      title="Swarm"
                      onChange={(e) =>
                        changeTargetStorage(StorageTypes.Swarm, !e)
                      }
                    />
                  </div>
                }
              />
              {/* storages */}
            </>
          }
        />
        <SettingWrapper
          title="Providers"
          children={
            <>
              <SettingItem
                title="Ethereum Provider"
                component={<></>}
                children={
                  <InputPanel
                    onChange={(e) => {
                      // setProviderInput(e.target.value)
                      setProvider(e.target.value)
                      setProviderEdited(true)
                      setProviderInputError(null)
                      console.log(providerInput)
                    }}
                    value={providerInput}
                    error={!isValidHttp(providerInput)}
                    placeholder={`${providerInput}`}
                  />
                }
              />
              <SettingItem
                title="Swarm Gateway"
                component={<></>}
                children={
                  <InputPanel
                    value={swarmGatewayInput}
                    error={!isValidHttp(swarmGatewayInput)}
                    onChange={(e) => {
                      setSwarmGateway(e.target.value)
                      // setSwarmGatewayInput(e.target.value)
                      setSwarmGatewayInputError(null)
                      setSwarmGatewayEdited(true)
                    }}
                    placeholder={`${swarmGatewayInput}`}
                  />
                }
              />
              <SettingItem
                title="Swarm Postage Stamp ID"
                component={<></>}
                children={
                  <InputPanel
                    value={swarmPostageStampIdInput}
                    error={
                      !!swarmPostageStampIdInputError ||
                      !isValidPostageStampId(swarmPostageStampIdInput)
                    }
                    onChange={(e) => {
                      setSwarmPostageStampId(e.target.value)
                      // setSwarmPostageStampIdInput(e.target.value)
                      setSwarmPostageStampIdInputError(null)
                      setSwarmPostageStampIdInputEdited(true)
                    }}
                    placeholder={`${swarmPostageStampIdInput}`}
                  />
                }
              />
              <SettingItem
                title="IPFS Gateway"
                component={<></>}
                children={
                  <InputPanel
                    value={ipfsGatewayInput}
                    onChange={(e) => {
                      // setIpfsGatewayInput(e.target.value)
                      setIpfsGateway(e.target.value)
                      setIpfsGatewayEdited(true)
                      setIpfsGatewayInputError(null)
                    }}
                    placeholder={`${ipfsGatewayInput}`}
                  />
                }
              />
              <SettingItem
                title="SIA Portal"
                component={<></>}
                children={
                  <InputPanel
                    value={siaPortalInput}
                    onChange={(e) => {
                      setSiaPortal(e.target.value)
                      setSiaPortalEdited(true)
                      setSiaPortalInputError(null)
                    }}
                    placeholder={`${siaPortalInput}`}
                  />
                }
              />
            </>
          }
        />
      </div>
    </div>
  )
}
// https://goerli.mooo.com
// https://goerli.infura.io/v3/9ded73debfaf4834ac186320de4f85fd
// https://goerli.infura.io/v3/6b34a47d1ef24f5b9cfff55d32685ad9
// https://rpc.goerli.mudit.blog/
// invalid
// https://goerli.infura.io/v3/123123123
