import { initBGFunctions } from 'chrome-extension-message-wrapper'
import cn from 'classnames'
import React, { FC, useEffect, useRef, useState } from 'react'
import { browser } from 'webextension-polyfill-ts'
import ModuleInfo from '../../../../../background/models/moduleInfo'
import VersionInfo from '../../../../../background/models/versionInfo'
import { DEFAULT_BRANCH_NAME, StorageTypes } from '../../../../../common/constants'
import { chainByUri, typeOfUri } from '../../../../../common/helpers'
import { ChainTypes, DefaultSigners } from '../../../../../common/types'
import FireBurn from '../../assets/png/fireBurn.png'
import { ReactComponent as Burn } from '../../assets/svg/burn.svg'
import { ReactComponent as CloseBurnModal } from '../../assets/svg/closeBurnModal.svg'
import { ReactComponent as Settings } from '../../assets/svg/setting.svg'
import { Modal } from '../Modal'
import { StorageRefImage } from '../StorageRefImage'
import styles from './DevModulesList.module.scss'

enum DeploymentStatus {
  Unknown,
  Deployed,
  NotDeployed,
  NewModule,
}

enum FormMode {
  Deploying,
  Creating,
  Editing,
}
enum DependencyType {
  Dependency,
  Interface,
}
type DependencyChecking = {
  name: string
  version: string
  type: DependencyType
  isExists?: boolean
}

interface PropsDevModule {
  setDappletsDetail: (x) => void
  modules: {
    module: ModuleInfo
    versions: VersionInfo[]
    isDeployed: boolean[]
  }
  onDetailsClick: (x: any, y: any) => void
  setModuleInfo: (x) => void
  setModuleVersion: (x) => void
  setUnderConstructionDetails: (x) => void
  isLocalhost?: boolean
  setUpdate?: (x) => void
  isLoadingDeploy?: boolean
  setLoadingDeploy?: () => void
  setLoadingDeployFinally?: () => void
  setOpenWallet?: () => void
  connectedDescriptors?: []
  selectedWallet?: string
  setCurrentAccount?: (x: any) => void
  currentAccount?: any
}

export const DevModule: FC<PropsDevModule> = (props) => {
  const {
    modules,
    onDetailsClick,
    setDappletsDetail,
    setModuleInfo,
    setModuleVersion,
    setUnderConstructionDetails,
    isLocalhost = false,
    setUpdate,
    isLoadingDeploy,
    setLoadingDeploy,
    setLoadingDeployFinally,
    setOpenWallet,
    connectedDescriptors,
    selectedWallet,
    currentAccount,
    setCurrentAccount,
  } = props

  const [mi, setMi] = useState(modules.module)
  const vi = modules.versions[0]
  const [targetRegistry, setTargetRegistry] = useState(null)

  const [trustedUsers, setTrustedUsers] = useState([])
  const [mode, setMode] = useState<FormMode>(null)
  const [targetStorages, setTargetStorages] = useState([StorageTypes.Swarm, StorageTypes.Ipfs])
  const [targetChain, setTargetChain] = useState<ChainTypes>(null)
  const [deploymentStatus, setDeploymentStatus] = useState(DeploymentStatus.Unknown)
  const [owner, setOwner] = useState(null)
  const [ownerDev, setOwnerDev] = useState(null)
  const [dependenciesChecking, setDpendenciesChecking] = useState<DependencyChecking[]>([])
  const nodeButton = useRef<HTMLButtonElement>()

  const [messageError, setMessageError] = useState(null)
  const [isModalError, setModalError] = useState(false)
  const [isModalErrorOwner, setModalErrorOwner] = useState(false)
  const onCloseError = () => setModalError(false)
  const onCloseErrorOwner = () => setModalErrorOwner(false)
  const [isNotAccountModal, setNotAccountModal] = useState(false)
  const [isNewModule, setNewModule] = useState(false)
  const onCloseNewModule = () => setNewModule(false)
  const [admins, setAdmins] = useState<string[]>([])
  const [adminsOpen, setAdminsOpen] = useState(false)
  const [counterBurn, setCounterBurn] = useState(null)
  const [isModalBurn, setModalBurn] = useState(false)
  const onCloseModalBurn = () => setModalBurn(false)
  useEffect(() => {
    const init = async () => {
      await _updateData()
    }
    init()
    return () => {}
  }, [targetChain])

  const _updateData = async () => {
    const { getRegistries, getTrustedUsers, getCounterStake } = await initBGFunctions(browser)
    const registries = await getRegistries()
    const trustedUsers = await getTrustedUsers()
    const prodRegistries = registries.filter((r) => !r.isDev && r.isEnabled)
    if (mi.isUnderConstruction) {
      const counter = await getCounterStake(mi.name)
      setCounterBurn(counter)
    }
    if (mi === null && vi === null) {
      const newMi = new ModuleInfo()
      setMi(newMi)
      setMode(FormMode.Creating)
    } else {
      const dependencies = vi?.dependencies
        ? Object.entries(vi.dependencies).map(([name, version]) => ({
            name: name,
            version: version,
            type: DependencyType.Dependency,
          }))
        : []
      const interfaces = vi?.interfaces
        ? Object.entries(vi.interfaces).map(([name, version]) => ({
            name: name,
            version: version,
            type: DependencyType.Interface,
          }))
        : []
      const dependenciesChecking = [...dependencies, ...interfaces]

      setDpendenciesChecking(dependenciesChecking)
      setTargetStorages(
        Object.keys(vi?.overlays ?? {}).length > 0
          ? [StorageTypes.Swarm]
          : [StorageTypes.Swarm, StorageTypes.Ipfs]
      )
      setMode(FormMode.Deploying)
      setTargetRegistry(prodRegistries[0]?.url || null)
      setTrustedUsers(trustedUsers)
      setTargetChain(chainByUri(typeOfUri(prodRegistries[0]?.url ?? '')))
    }

    if (mode === FormMode.Creating) {
      await _updateCurrentAccount()
      await updateDataLocalhost()
      await getModulesAdmins()
    } else {
      return Promise.all([
        _updateOwnership(),
        getModulesAdmins(),
        _updateCurrentAccount(),
        _updateDeploymentStatus(),
        _checkDependencies(),
        updateDataLocalhost(),
      ])
    }
  }

  const getModulesAdmins = async () => {
    if (!targetRegistry || !mi.name) return
    const { getAdmins } = await initBGFunctions(browser)
    const authors: string[] = await getAdmins(targetRegistry, mi.name)

    if (authors.length > 0) {
      setAdmins(authors)
    }
  }

  const _updateOwnership = async () => {
    if (!targetRegistry || !mi.name) return
    const { getOwnership } = await initBGFunctions(browser)
    const owner = await getOwnership(targetRegistry, mi.name)

    setOwner(owner)
    setOwnerDev(owner)
  }

  const _updateDeploymentStatus = async () => {
    setDeploymentStatus(DeploymentStatus.Unknown)

    const { getVersionInfo, getModuleInfoByName } = await initBGFunctions(browser)
    const miF = await getModuleInfoByName(targetRegistry, mi.name)
    const deployed = vi
      ? await getVersionInfo(targetRegistry, mi.name, vi.branch, vi.version)
      : true
    const deploymentStatus = !miF
      ? DeploymentStatus.NewModule
      : deployed
      ? DeploymentStatus.Deployed
      : DeploymentStatus.NotDeployed

    setDeploymentStatus(deploymentStatus)
  }

  const _updateCurrentAccount = async () => {
    if (targetChain) {
      const { getAddress } = await initBGFunctions(browser)
      const currentAccount = await getAddress(DefaultSigners.EXTENSION, targetChain)

      setCurrentAccount(currentAccount)
    } else {
      return
    }
  }

  const _checkDependencies = async () => {
    const { getVersionInfo } = await initBGFunctions(browser)

    await Promise.all(
      dependenciesChecking.map((x) =>
        getVersionInfo(targetRegistry, x.name, DEFAULT_BRANCH_NAME, x.version).then(
          (y) => (x.isExists = !!y)
        )
      )
    )
  }

  const deployButtonClickHandler = async (e) => {
    const { deployModule, addTrustedUser } = await initBGFunctions(browser)
    let newDescriptors
    let isOwner
    const unificationAdmins = admins.map((e) => e.toLowerCase())
    const includesAdmins = unificationAdmins.includes(currentAccount)

    if (connectedDescriptors && connectedDescriptors.length > 0) {
      newDescriptors = connectedDescriptors.find((x: any) => x.type === selectedWallet)
    }
    if (connectedDescriptors && connectedDescriptors.length > 0) {
      isOwner = connectedDescriptors.find((x: any) => {
        if (owner && x.account === owner.toLowerCase()) {
          return x.account
        }
      })
    }
    const isNotNullCurrentAccount = !(
      !currentAccount || currentAccount === '0x0000000000000000000000000000000000000000'
    )
    const isNotTrustedUser =
      isNotNullCurrentAccount &&
      !trustedUsers.find((x) => x.account.toLowerCase() === currentAccount.toLowerCase())
    if (isNotTrustedUser) {
      await addTrustedUser(currentAccount.toLowerCase())
    }
    if (!isNotNullCurrentAccount || (!isOwner && deploymentStatus !== 3 && !includesAdmins)) {
      setNotAccountModal(true)
    } else if (isOwner && isOwner.account !== newDescriptors.account && deploymentStatus !== 3) {
      setModalErrorOwner(true)
    } else {
      try {
        setLoadingDeploy()
        nodeButton.current.classList.add('dappletsIsLoadingDeploy')

        if (deploymentStatus === 3) {
          setNewModule(true)
        } else {
          mode === FormMode.Creating
            ? await deployModule(mi, null, targetStorages, targetRegistry)
            : await deployModule(mi, vi, targetStorages, targetRegistry)

          setDeploymentStatus(DeploymentStatus.Deployed)
          setUpdate(true)
        }
      } catch (err) {
        console.log(err)

        setMessageError({
          type: 'negative',
          header: 'Publication error',
          message: [err.message],
        })
        if (err.message) {
          nodeButton.current.classList.remove('dappletsIsLoadingDeploy')
          const messageErr = err.message.toLowerCase()
          messageErr.includes(' are not the owner of this module') ? setModalErrorOwner(true) : null
        }

        setModalError(true)
        setNotAccountModal(false)
      } finally {
        setLoadingDeployFinally()
        await _updateData()
      }
    }
  }

  const connectWallet = async () => {
    setNotAccountModal(false)
    const { pairWalletViaOverlay } = await initBGFunctions(browser)
    try {
      await pairWalletViaOverlay(null, DefaultSigners.EXTENSION, null)
      await _updateData()
    } catch (e) {
      console.log(e)
    }
  }

  const deployNewModule = async () => {
    const { deployModule } = await initBGFunctions(browser)
    try {
      setLoadingDeploy()
      nodeButton.current.classList.add('dappletsIsLoadingDeploy')

      onCloseNewModule()
      mode === FormMode.Creating
        ? await deployModule(mi, null, targetStorages, targetRegistry)
        : await deployModule(mi, vi, targetStorages, targetRegistry)

      setDeploymentStatus(DeploymentStatus.Deployed)
      setUpdate(true)
    } catch (err) {
      console.log(err)

      setMessageError({
        type: 'negative',
        header: 'Publication error',
        message: [err.message],
      })
      if (err.message) {
        nodeButton.current.classList.remove('dappletsIsLoadingDeploy')
        const messageErr = err.message.toLowerCase()
        messageErr.includes(' are not the owner of this module') ? setModalErrorOwner(true) : null
      }

      setModalError(true)
      setNotAccountModal(false)
    } finally {
      setLoadingDeployFinally()
      await _updateData()
    }
  }

  const updateDataLocalhost = async () => {
    const { getRegistries, getOwnership } = await initBGFunctions(browser)
    const registries = await getRegistries()

    const newRegistries = registries
      .filter((r) => r.isDev === false && r.isEnabled !== false)
      .map((x, i) => x.url)
    const newOwner = await getOwnership(newRegistries[0], mi.name)

    setOwnerDev(newOwner)
  }
  const setBurnDucToken = async (appId) => {
    const { setBurnDucToken } = await initBGFunctions(browser)
    await setBurnDucToken(appId)
  }
  return (
    <>
      <div className={styles.dappletsBlock}>
        <StorageRefImage storageRef={mi.icon} />

        <div className={styles.dappletsInfo}>
          <div className={styles.dappletsTags}>
            {vi && vi.version ? (
              <div className={styles.dappletsVersion}>{vi.version}</div>
            ) : (
              <div className={styles.dappletsVersionUC}>Under Construction</div>
            )}
            {counterBurn && (
              <button  className={styles.dappletsBurn}>
                <Burn />
                {counterBurn >= 1 ? counterBurn + 'days' : 'burning'}
              </button>
            )}
            {vi && vi.branch && vi.branch !== 'default' && (
              <div style={{ margin: '0 3px 0 0px' }} className={styles.dappletsBranch}>
                {vi.branch}
              </div>
            )}
            {modules.isDeployed[0] === false && isLocalhost && (
              <div className={styles.dappletsNotDeploy}>not deployed</div>
            )}
          </div>

          <div className={styles.blockInfo}>
            <h3 className={styles.dappletsTitle}>{mi.title}</h3>
            {mi.isUnderConstruction ? (
              <span
                onClick={() => {
                  onDetailsClick(mi, vi)

                  setUnderConstructionDetails(true)
                  setModuleInfo(mi)
                  setModuleVersion(vi)
                }}
                className={styles.dappletsSettingsIsUnderConstructionBlock}
              >
                <button className={styles.dappletsSettingsIsUnderConstruction} />
                <span className={styles.dappletsSettingsIsTocenomics} />
              </span>
            ) : (
              <button
                className={cn(styles.dappletsSettings, {
                  [styles.dappletsSettingsRegistry]: mi.author !== null,
                  [styles.noneVisible]: isLocalhost,
                })}
                onClick={() => {
                  // TODO: DELETE J add contextID
                  mi.contextIds = []
                  onDetailsClick(mi, vi)
                  setDappletsDetail(true)

                  setModuleInfo(mi)
                  setModuleVersion(vi)
                }}
              >
                <Settings />
              </button>
            )}
            {mi.isUnderConstruction || !isLocalhost ? null : (
              <button
                ref={nodeButton}
                disabled={isLoadingDeploy}
                onClick={(e) => {
                  modules.isDeployed?.[0] === false &&
                    _updateCurrentAccount().then(() => deployButtonClickHandler(e))
                }}
                className={cn(styles.dappletsReupload, {
                  [styles.dappletDeploy]: modules.isDeployed?.[0] !== false,
                })}
              >
                {nodeButton.current &&
                nodeButton.current?.classList.contains('dappletsIsLoadingDeploy')
                  ? ''
                  : 'Deploy'}
              </button>
            )}
            {!mi.isUnderConstruction ? null : (
              <button
              
              
              onClick={() => setModalBurn(true)}
                className={cn(styles.dappletsReupload, styles.btnBurn)}
              >
              <Burn style={{marginRight:'5px'}} />  Burn
              </button>
            )}
          </div>
          <div className={styles.dappletsLabel}>
            {mi.name && (
              <div>
                <span className={styles.dappletsLabelSpan}>Name:</span>
                <label className={cn(styles.dappletsLabelSpan, styles.dappletsLabelSpanInfo)}>
                  {mi.name}
                </label>
              </div>
            )}

            {(mi.author || ownerDev) && (
              <div>
                <span className={styles.dappletsLabelSpan}>Owner:</span>
                <label className={cn(styles.dappletsLabelSpan, styles.dappletsLabelSpanInfo)}>
                  {mi.author ? mi.author : ownerDev}
                </label>
              </div>
            )}
            {isLocalhost && admins && admins.length > 0 ? (
              <div>
                <div className={styles.dappletsLabelSpan} style={{ width: 'auto' }}>
                  Admins:
                </div>
                <div
                  className={cn(styles.dappletsLabelSpan, styles.dappletsLabelSpanInfo)}
                  style={{ flexWrap: 'wrap', marginLeft: '4px' }}
                >
                  {admins.map((admin: string, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: !adminsOpen && i > 1 ? 'none' : 'flex',
                        marginBottom: '4px',
                      }}
                    >
                      {admin}
                    </div>
                  ))}
                  {admins.length > 2 && !adminsOpen && (
                    <div className={styles.moreAdmins} onClick={() => setAdminsOpen(!adminsOpen)}>
                      ...
                    </div>
                  )}
                </div>
                {admins.length > 2 && (
                  <button
                    className={styles.adminsListButton}
                    onClick={() => setAdminsOpen(!adminsOpen)}
                  >
                    {adminsOpen ? '▴' : '▾'}
                  </button>
                )}
              </div>
            ) : null}

            <div>
              <span className={styles.dappletsLabelSpan}>Type:</span>
              <label className={cn(styles.dappletsLabelSpan, styles.dappletsLabelSpanInfo)}>
                {mi.type}
              </label>
            </div>
          </div>
        </div>
      </div>

      {isNotAccountModal ? (
        owner ? (
          <Modal
            visible={isNotAccountModal}
            title={'The wrong wallet'}
            classNameContent={styles.isNotAccountModalOwner}
            content={
              <div className={styles.modalDefaultContent}>
                <p style={{ overflowWrap: 'break-word' }}>Connect account to {owner}</p>

                <br />
                <button onClick={connectWallet} className={styles.modalDefaultContentButton}>
                  Connect a new wallet
                </button>
              </div>
            }
            footer={''}
            onClose={() => setNotAccountModal(false)}
          />
        ) : (
          <Modal
            visible={isNotAccountModal}
            title={'Wallet is not connected'}
            classNameContent={styles.isNotAccountModalOwner}
            content={
              <div className={styles.modalDefaultContent}>
                <p style={{ overflowWrap: 'break-word' }}>
                  You can not deploy a module without a wallet.
                </p>

                <br />
                <button onClick={connectWallet} className={styles.modalDefaultContentButton}>
                  Connect a new wallet
                </button>
              </div>
            }
            footer={''}
            onClose={() => setNotAccountModal(false)}
          />
        )
      ) : null}

      {messageError ? (
        <Modal
          visible={isModalError}
          title={messageError.header}
          classNameWrapper={styles.modalDefaultWrapper}
          content={
            <div className={styles.modalDefaultContent}>
              {messageError.message.map((m, i) => (
                <p key={i} className={styles.modalDefaultContentText}>
                  {m === `Cannot read properties of null (reading 'length')`
                    ? 'Please fill in the empty fields'
                    : m}
                </p>
              ))}

              <button onClick={() => onCloseError()} className={styles.modalDefaultContentButton}>
                Ok
              </button>
            </div>
          }
          footer={''}
          onClose={() => onCloseError()}
        />
      ) : null}

      <Modal
        visible={isModalErrorOwner}
        title={'THE WRONG WALLET'}
        classNameWrapper={styles.modalDefaultWrapper}
        content={
          <div className={styles.modalDefaultContent}>
            <p className={styles.modalDefaultContentText}></p>

            <button
              onClick={() => {
                setOpenWallet()
                onCloseErrorOwner()
              }}
              className={styles.modalDefaultContentButton}
            >
              GO TO THE WALLETS
            </button>
          </div>
        }
        footer={''}
        onClose={() => onCloseErrorOwner()}
      />
      <Modal
        visible={isNewModule}
        onFewFunction={() => {
          nodeButton.current.classList.remove('dappletsIsLoadingDeploy')
          setLoadingDeployFinally()
        }}
        title={'Deploy new module'}
        classNameWrapper={styles.modalDefaultWrapper}
        content={
          <div className={styles.modalDefaultContent}>
            <p className={styles.modalDefaultContentText}>
              You deploy the first version of the "{mi.name}".
            </p>
            <p className={styles.modalDefaultContentText}>
              After deployment the dapplet will be owned by this account -
              <span className={styles.modalLabelAccount}> {currentAccount}</span>
            </p>
            <br />
            <p className={styles.modalDefaultContentText}>
              A dapplet’s ownership is represented through an NFT.
            </p>
            <p className={styles.modalDefaultContentText}>
              When the dapplet is made this NFT will automatically be created and sent to this
              account
              <br />
              <span className={styles.modalLabelAccount}>{currentAccount}</span>.
            </p>
            <p className={styles.modalDefaultContentText}>
              You can change the dapplet owner by transferring this NFT or by selling it at a
              marketplace.
            </p>
            <br />
            <button onClick={deployNewModule} className={styles.modalDefaultContentButton}>
              Ok
            </button>
          </div>
        }
        footer={''}
        onClose={() => onCloseNewModule()}
      />
      <Modal
        visible={isModalBurn}
        title={'Reallocating the pledge fund'}
        classNameWrapper={styles.modalDefaultWrapper}
        content={
          <div className={cn(styles.modalDefaultContent, styles.modalBurnDefaultContent)}>
            <p className={cn(styles.modalDefaultContentText, styles.modalDefaultContentTextBurn)}>
              You are reporting expired DUC pledge. If you proceed the pledge fund will be
              redistributed.
            </p>
            <p className={cn(styles.modalDefaultContentText, styles.modalDefaultContentTextBurn)}>
              You wil recive: <span className={styles.price}>5 ETH</span>
            </p>
            <img src={FireBurn} />
          </div>
        }
        footer={
          <div className={styles.buttonBlockBurn}>
            <button
              onClick={() => setBurnDucToken(mi.name)}
              className={styles.modalDefaultContentButton}
            >
              <Burn /> Do it
            </button>
            <button
              onClick={() => onCloseModalBurn()}
              className={cn(styles.modalDefaultContentButton, styles.burnCancel)}
            >
              <CloseBurnModal /> Cancel
            </button>
          </div>
        }
        onClose={() => onCloseModalBurn()}
      />
    </>
  )
}
