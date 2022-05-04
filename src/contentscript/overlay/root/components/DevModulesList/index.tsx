import React, { useState, useEffect, FC } from 'react'
import ModuleInfo from '../../../../../background/models/moduleInfo'
import VersionInfo from '../../../../../background/models/versionInfo'
// import { StorageRefImage } from '../../../../../popup/components/StorageRefImage'
import { StorageRef } from '../../../../../background/registries/registry'
// import { StorageRefImage } from './StorageRefImage'
import { DEFAULT_BRANCH_NAME } from '../../../../../common/constants'
import TopologicalSort from 'topological-sort'
import styles from './DevModulesList.module.scss'
import cn from 'classnames'
import { initBGFunctions } from 'chrome-extension-message-wrapper'
// import NO_LOGO from '../../assets/images/no-logo.png'
import { browser } from 'webextension-polyfill-ts'
import { ChainTypes, DefaultSigners } from '../../../../../common/types'
import {
  // DEFAULT_BRANCH_NAME,
  ModuleTypes,
  StorageTypes,
} from '../../../../../common/constants'
import { typeOfUri, chainByUri, joinUrls } from '../../../../../common/helpers'
let _isMounted = true
enum DeploymentStatus {
  Unknown,
  Deployed,
  NotDeployed,
  NewModule,
}
interface PropsStorageRefImage {
  storageRef: StorageRef
  className?: string
}
// export const enum ModuleTypes {
//   Feature = 'FEATURE',
//   Adapter = 'ADAPTER',
//   Library = 'LIBRARY',
//   Interface = 'INTERFACE',
// }
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

export const StorageRefImage: FC<PropsStorageRefImage> = (props) => {
  const { storageRef, className } = props
  const [dataUri, setDataUri] = useState(null)
  useEffect(() => {
    _isMounted = true
    // loadSwarmGateway()

    const init = async () => {
      const { hash, uris } = storageRef
      // console.log(storageRef)

      if (!hash && uris.length > 0 && uris[0].indexOf('data:') === 0) {
        setDataUri(uris[0])
      } else {
        const { getResource } = await initBGFunctions(browser)
        if (
          storageRef.hash !==
            '0x0000000000000000000000000000000000000000000000000000000000000000' ||
          storageRef.uris.length !== 0
        ) {
          const base64 = await getResource(storageRef)
          const dataUri = 'data:text/plain;base64,' + base64
          setDataUri(dataUri)
        } else {
          setDataUri(null)
        }
      }
    }
    init()
    return () => {
      _isMounted = false
    }
  })
  return (
    <div className={cn(styles.dappletsImg, className)}>
      {dataUri ? <img src={dataUri} /> : <span className={styles.noLogo} />}
    </div>
  )
}
interface PropsDeveloper {
  isDappletsDetails: boolean
  setDappletsDetail: (x) => void
  modules: {
    module: ModuleInfo
    versions: VersionInfo[]
    isDeployed: boolean[]
  }[]
  onDetailsClick: (x: any, y: any) => void
  setModuleInfo: (x) => void
  setModuleVersion: (x) => void
  isUnderConstructionDetails: boolean
  setUnderConstructionDetails: (x) => void
  // deployButtonClickHandler?: () => void
}
export const DevModule: FC<PropsDeveloper> = (props) => {
  const {
    modules,
    onDetailsClick,
    isDappletsDetails,
    setDappletsDetail,
    setModuleInfo,
    setModuleVersion,
    isUnderConstructionDetails,
    setUnderConstructionDetails,
    // deployButtonClickHandler,
  } = props
  // const [dapDet, onDappletsDetails] = useState(isDappletsDetails)
  const nodes = new Map<string, any>()
  const [mi, setMi] = useState<ModuleInfo>(modules[0].module)
  const [vi, setVi] = useState<VersionInfo>()
  const [targetRegistry, setTargetRegistry] = useState(null)
  const [currentAccount, setCurrentAccount] = useState(null)
  const [trustedUsers, setTrustedUsers] = useState([])
  const [mode, setMode] = useState(FormMode.Deploying)
  const [targetStorages, setTargetStorages] = useState([
    StorageTypes.Swarm,
    StorageTypes.Sia,
    StorageTypes.Ipfs,
  ])
  const [registryOptions, setRegistryOptions] = useState([])
  const [targetChain, setTargetChain] = useState<ChainTypes>(null)
  const [deploymentStatus, setDeploymentStatus] = useState(
    DeploymentStatus.Unknown
  )
  const [owner, setOwner] = useState(null)
  const [dependenciesChecking, setDpendenciesChecking] = useState<
    DependencyChecking[]
  >([])

  useEffect(() => {
    _isMounted = true
    // loadSwarmGateway()

    const init = async () => {
      await _updateData()
    }
    init()
    return () => {
      _isMounted = false
    }
  })
  modules.forEach((x) => {
    nodes.set(
      x.versions[0]
        ? x.module.name + '#' + x.versions[0]?.branch
        : x.module.name,
      x
    )
    // console.log(x)
  })
  const sorting = new TopologicalSort(nodes)
  modules.forEach((x) => {
    const deps = [
      ...Object.keys(x.versions[0]?.dependencies || {}),
      ...Object.keys(x.versions[0]?.interfaces || {}),
    ]
    deps.forEach((d) => {
      if (nodes.has(d + '#' + DEFAULT_BRANCH_NAME)) {
        sorting.addEdge(
          d + '#' + DEFAULT_BRANCH_NAME,
          x.module.name + '#' + x.versions[0]?.branch
        )
      }
      // console.log(x)
    })
  })
  const sorted = [...sorting.sort().values()].map((x) => x.node)

  const visible = (hash: string): string => {
    if (hash.length > 28) {
      const firstFourCharacters = hash.substring(0, 14)
      const lastFourCharacters = hash.substring(
        hash.length - 0,
        hash.length - 14
      )

      return `${firstFourCharacters}...${lastFourCharacters}`
    } else {
      return hash
    }
  }

  const _updateData = async () => {
    // setLoading(true)
    const { getRegistries, getTrustedUsers } = await initBGFunctions(browser)

    const registries = await getRegistries()
    const trustedUsers = await getTrustedUsers()
    const prodRegistries = registries.filter((r) => !r.isDev && r.isEnabled)
    setRegistryOptions(
      prodRegistries.map((r) => ({
        key: r.url,
        text: r.url,
        value: r.url,
      }))
    )
    setTargetRegistry(prodRegistries[0]?.url || null)
    setTrustedUsers(trustedUsers)
    setTargetChain(chainByUri(typeOfUri(prodRegistries[0]?.url ?? '')))

    await _updateCurrentAccount()

    // if (mode === FormMode.Creating) {
    // await _updateCurrentAccount()
    // } else {
    //   return Promise.all([
    //     _updateOwnership(),
    //     _updateCurrentAccount(),
    //     _updateDeploymentStatus(),
    //     _checkDependencies(),
    //   ])
    // }
  }
  const _updateOwnership = async () => {
    const { getOwnership } = await initBGFunctions(browser)
    const owner = await getOwnership(targetRegistry, mi.name)
    setOwner(owner)
  }
  // const _updateDeploymentStatus = async () => {
  //   // const s = this.state
  //   setDeploymentStatus(DeploymentStatus.NewModule)

  //   const { getVersionInfo, getModuleInfoByName } = await initBGFunctions(
  //     browser
  //   )
  //   const miF = await getModuleInfoByName(targetRegistry, mi.name)
  //   const deployed = vi
  //     ? await getVersionInfo(targetRegistry, miF.name, vi.branch, vi.version)
  //     : true
  //   const deploymentStatus = !miF
  //     ? DeploymentStatus.NewModule
  //     : deployed
  //     ? DeploymentStatus.Deployed
  //     : DeploymentStatus.NotDeployed
  //   setDeploymentStatus(deploymentStatus)
  // }
  const _updateCurrentAccount = async () => {
    const { getOwnership, getAddress } = await initBGFunctions(browser)
    const currentAccount = await getAddress(
      DefaultSigners.EXTENSION,
      targetChain
    )
    setCurrentAccount(currentAccount)
    // setLoading(false)
    // console.log(targetChain)

    // console.log(currentAccount)
  }
  // const _checkDependencies = async () => {
  //   const { getVersionInfo } = await initBGFunctions(browser)
  //   // const { dependenciesChecking } = dependenciesChecking
  //   // const {targetRegistry} = targetRegistry
  //   // await Promise.all(
  //   dependenciesChecking.map((x) =>
  //     getVersionInfo(
  //       targetRegistry,
  //       x.name,
  //       DEFAULT_BRANCH_NAME,
  //       x.version
  //     ).then((y) => (x.isExists = !!y))
  //   )
  //   // )
  // }

  const deployButtonClickHandler = async () => {
    const { deployModule, addTrustedUser } = await initBGFunctions(browser)

    mi.registryUrl = targetRegistry
    mi.author = currentAccount
    mi.type = ModuleTypes.Feature
    console.log(targetRegistry)
    console.log(currentAccount)

    try {
      // setModalTransaction(true)
      const isNotNullCurrentAccount = !(
        !currentAccount ||
        currentAccount === '0x0000000000000000000000000000000000000000'
      )
      const isNotTrustedUser =
        isNotNullCurrentAccount &&
        !trustedUsers.find(
          (x) => x.account.toLowerCase() === currentAccount.toLowerCase()
        )
      if (isNotTrustedUser) {
        await addTrustedUser(currentAccount.toLowerCase())
      }

      // setMessage({
      //   type: 'positive',
      //   header: 'Module was deployed',
      //   message: [`Script URL: ${result.scriptUrl}`],
      // })
      // setModalTransaction(false)
      // setModalEndCreation(true)
      // setDeploymentStatus(DeploymentStatus.Deployed)

      const result =
        mode === FormMode.Creating
          ? await deployModule(mi, null, targetStorages, targetRegistry)
          : await deployModule(mi, vi, targetStorages, targetRegistry)

      setDeploymentStatus(DeploymentStatus.Deployed)
    } catch (err) {
      // setMessage({
      //   type: 'negative',
      //   header: 'Publication error',
      //   message: [err.message],
      // })
      // setModal(true)
      console.log(err)
    } finally {
      // setModalTransaction(false)
    }
  }

  return (
    <>
      {sorted.map((m, i) => (
        <div className={styles.dappletsBlock} key={i}>
          <StorageRefImage storageRef={m.module.icon} />
          {/* {m.isDeployed?.[0] === true ? <span /> : null} */}
          <div className={styles.dappletsInfo}>
            <div className={styles.dappletsTegs}>
              {
                m.versions && m.versions[0] && m.versions[0].version ? (
                  <div className={styles.dappletsVersion}>
                    {m.versions[0].version}
                  </div>
                ) : null
                //  (
                //   <div className={styles.dappletsVersion}>UK</div>
                // )
              }

              {m.versions &&
                m.versions[0] &&
                m.versions[0].branch &&
                m.versions[0].branch !== 'default' && (
                  <div className={styles.dappletsBranch}>
                    {m.versions[0].branch}
                  </div>
                )}
              {m.isDeployed?.[0] === false && (
                <div className={styles.dappletsNotDeploy}>not deployed</div>
              )}
            </div>

            <div className={styles.blockInfo}>
              <h3
                onClick={() => {
                  console.log(m.module)
                  console.log(m.versions[0])
                }}
                className={styles.dappletsTitle}
              >
                {m.module.title}
              </h3>
              {m.module.isUnderConstruction ? (
                <span
                  className={styles.dappletsSettingsIsUnderConstructionBlock}
                >
                  <button
                    className={styles.dappletsSettingsIsUnderConstruction}
                    onClick={() => {
                      onDetailsClick(m.module, m.versions[0])
                      setDappletsDetail(false)
                      setUnderConstructionDetails(true)
                      setModuleInfo(m.module)
                      setModuleVersion(m.versions[0])
                      // console.log(m.module, m.versions[0])
                    }}
                  />
                  <span className={styles.dappletsSettingsIsTocenomics} />
                </span>
              ) : (
                <button
                  className={styles.dappletsSettings}
                  onClick={() => {
                    onDetailsClick(m.module, m.versions[0])
                    setDappletsDetail(true)
                    setModuleInfo(m.module)
                    setModuleVersion(m.versions[0])
                    // console.log(m.module, m.versions[0])
                  }}
                />
              )}
              {m.module.isUnderConstruction ? (
                <button
                  // onClick={() => console.log(m.module.isUnderConstruction)}
                  className={cn(
                    styles.dappletsReuploadisUnderConstructionPublish,
                    {
                      [styles.dappletsReuploadisUnderConstructionDeploy]:
                        m.isDeployed?.[0] === false,
                    }
                  )}
                >
                  {m.isDeployed?.[0] === false ? 'Deploy' : 'Publish'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    // if () {
                    m.isDeployed?.[0] === false && deployButtonClickHandler()
                    // }
                  }}
                  className={styles.dappletsReupload}
                >
                  {m.isDeployed?.[0] === false ? 'Deploy' : 'Reupload'}
                </button>
              )}
            </div>
            <div className={styles.dappletsLabel}>
              {m.module.name && (
                <div>
                  <span className={styles.dappletsLabelSpan}>Name:</span>
                  <label
                    className={cn(
                      styles.dappletsLabelSpan,
                      styles.dappletsLabelSpanInfo
                    )}
                  >
                    {m.module.name}
                  </label>
                </div>
              )}

              {m.module.author && (
                <div>
                  <span className={styles.dappletsLabelSpan}>Ownership:</span>
                  <label
                    className={cn(
                      styles.dappletsLabelSpan,
                      styles.dappletsLabelSpanInfo
                    )}
                  >
                    {visible(` ${m.module.author}`)}
                  </label>
                </div>
              )}
              {m.module.registryUrl && (
                <div>
                  <span className={styles.dappletsLabelSpan}>Registry:</span>
                  <label
                    className={cn(
                      styles.dappletsLabelSpan,
                      styles.dappletsLabelSpanInfo
                    )}
                  >
                    {visible(`${m.module.registryUrl}`)}
                  </label>
                </div>
              )}
              {m.versions && m.versions[0] && m.versions[0].version && (
                <div>
                  <span className={styles.dappletsLabelSpan}>
                    Version in registry:
                  </span>
                  <label
                    className={cn(
                      styles.dappletsLabelSpan,
                      styles.dappletsLabelSpanInfo
                    )}
                  >
                    {m.versions[0].version}
                  </label>
                </div>
              )}
              <div>
                <span className={styles.dappletsLabelSpan}>Type:</span>
                <label
                  className={cn(
                    styles.dappletsLabelSpan,
                    styles.dappletsLabelSpanInfo
                  )}
                >
                  {m.module.type}
                </label>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
