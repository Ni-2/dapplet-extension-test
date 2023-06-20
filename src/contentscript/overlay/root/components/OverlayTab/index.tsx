import { initBGFunctions } from 'chrome-extension-message-wrapper'
import cn from 'classnames'
import makeBlockie from 'ethereum-blockies-base64'
import React, { ReactElement, useEffect, useRef, useState } from 'react'
import { browser } from 'webextension-polyfill-ts'
import { DAPPLETS_STORE_URL } from '../../../../../common/constants'
import * as EventBus from '../../../../../common/global-event-bus'
import {
  Notification,
  NotificationStatus,
  NotificationType,
} from '../../../../../common/models/notification'
import { StorageRef } from '../../../../../common/types'

import { ReactComponent as Store } from '../../assets/icons/iconsWidgetButton/store.svg'
import { ReactComponent as Event } from '../../assets/newIcon/notification.svg'
import { ReactComponent as HomeIcon } from '../../assets/svg/newHome.svg'
import { ReactComponent as SettingsIcon } from '../../assets/svg/newSettings.svg'
import { StorageRefImage } from '../../components/StorageRefImage'
import { ToolbarTabMenu } from '../../types'
import { ModuleIcon, ModuleIconProps } from '../ModuleIcon'
import { SquaredButton } from '../SquaredButton'
import styles from './OverlayTab.module.scss'

export interface OverlayTabProps {
  pinned: boolean
  title: string
  icon: string | StorageRef | React.FC<React.SVGProps<SVGSVGElement>> | ModuleIconProps
  isActive: boolean
  activeTabMenuId: string
  menus: ToolbarTabMenu[]
  onTabClick: () => void
  onCloseClick: () => void
  onMenuClick: (menu: ToolbarTabMenu) => void
  setOpenWallet?: any
  isOpenWallet?: boolean
  classNameTab?: string
  classNameIcon?: string
  classNameClose?: string
  classNameList?: string
  classNameItem?: string
  tabId?: string
  modules?: any
  navigate?: any
  pathname?: string
  overlays?: any
  onToggleClick?: any
  menuWidgets?: any
  getWigetsConstructor?: any
  mainMenuNavigation?: any
  connectedDescriptors?: any
  selectedWallet?: any
  isToolbar?: boolean
}

export const OverlayTab = (p: OverlayTabProps): ReactElement => {
  const visibleMenus = p.menus.filter((x) => x.hidden !== true)
  const nodeVisibleMenu = useRef<HTMLDivElement>()
  const [menuVisible, setMenuVisible] = useState(false)
  const [event, setEvent] = useState<Notification[]>([])
  const [isHome, setHome] = useState(false)

  useEffect(() => {
    !document
      .querySelector('#dapplets-overlay-manager')
      .classList.contains('dapplets-overlay-collapsed') && setMenuVisible(false)
    getHome()
  }, [menuVisible, isHome])

  useEffect(() => {
    const handleUpdateNotifications = async () => {
      const notifications = await getNotifications()
      setEvent(
        notifications && notifications.filter((x) => x.status === NotificationStatus.Highlighted)
      )
    }

    handleUpdateNotifications()
    EventBus.on('notifications_updated', handleUpdateNotifications)
    EventBus.on('show_notification', handleUpdateNotifications)

    return () => {
      EventBus.off('notifications_updated', handleUpdateNotifications)
      EventBus.off('show_notification', handleUpdateNotifications)
    }
  }, [])

  // const connectWallet = async () => {
  //   const { pairWalletViaOverlay } = await initBGFunctions(browser)
  //   try {
  //     await pairWalletViaOverlay(null, DefaultSigners.EXTENSION, null)
  //     p.setOpenWallet()
  //   } catch (_) {}
  // }
  const isModuleActive = () => {
    if (!p.modules) return false
    let isModuleActive

    p.modules
      .filter((x) => x.name === p.tabId)
      .map((x) => {
        if (x.isActive) return (isModuleActive = true)
        else {
          isModuleActive = false
        }
      })
    return isModuleActive
  }
  const getIconSelectedWallet = () => {
    if (p.selectedWallet) {
      const newIcon =
        p.connectedDescriptors &&
        p.connectedDescriptors.length > 0 &&
        p.connectedDescriptors.filter((x) => x.type === p.selectedWallet)

      const iconLogin =
        newIcon && newIcon[0]?.account && makeBlockie(newIcon[0]?.account.toLowerCase())
      return iconLogin
    } else null
  }

  const onOpenDappletAction = async (f: string) => {
    if (!p.modules) return
    let isModuleActive
    p.modules
      .filter((x) => x.name === f)
      .map((x) => {
        if (x.isActionHandler) return (isModuleActive = true)
        else {
          isModuleActive = false
        }
      })

    const isOverlayActive = p.overlays.find((x) => x.source === f)

    if (isModuleActive) {
      if ((p.pathname.includes('system') && p.overlays.lenght === 0) || !isOverlayActive) {
        try {
          const { openDappletAction, getCurrentTab } = await initBGFunctions(browser)
          const tab = await getCurrentTab()
          if (!tab) return
          await openDappletAction(f, tab.id)
          if (
            document
              .querySelector('#dapplets-overlay-manager')
              .classList.contains('dapplets-overlay-collapsed')
          ) {
            p.onToggleClick()
          }
        } catch (err) {
          console.error(err)
        }
      } else {
        p.overlays.filter((x) => x.source === f).map((x) => p.navigate!(`/${f}/${x.id}`))
        if (
          document
            .querySelector('#dapplets-overlay-manager')
            .classList.contains('dapplets-overlay-collapsed')
        ) {
          p.onToggleClick()
        }
      }
    } else {
      p.onTabClick()
      if (
        document
          .querySelector('#dapplets-overlay-manager')
          .classList.contains('dapplets-overlay-collapsed')
      ) {
        p.onToggleClick()
      }
    }
  }

  const onOpenStore = async (f: string) => {
    const url = `${DAPPLETS_STORE_URL}/#searchQuery=${f}`
    window.open(url, '_blank')
  }

  const getNotifications = async () => {
    const { getNotifications } = await initBGFunctions(browser)
    const notifications = await getNotifications(NotificationType.Application)
    return notifications
  }
  // const _handleCloseClick: React.MouseEventHandler<HTMLSpanElement> = (e) => {
  //   e.preventDefault()
  //   e.stopPropagation()
  //   p.onCloseClick()
  // }
  // console.log(p.modules);
  const getHome = () => {
    if (!p.modules) return

    p.modules
      .filter((x) => x.name === p.tabId)
      .map((x) => {
        if (x.isActive && x.isActionHandler) return setHome(true)
        else {
          setHome(false)
        }
      })
  }

  return (
    <>
      {' '}
      {p.pinned || isModuleActive() ? (
        <div
          data-testid={!p.pinned ? 'tab-not-pinned' : 'tab-pinned'}
          tabIndex={0}
          onBlur={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (
              document
                .querySelector('#dapplets-overlay-manager')
                .classList.contains('dapplets-overlay-collapsed')
            ) {
              e.relatedTarget?.hasAttribute('data-visible') && menuVisible
                ? null
                : setMenuVisible(false)
            } else {
              setMenuVisible(false)
            }
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()

            if (
              document
                .querySelector('#dapplets-overlay-manager')
                .classList.contains('dapplets-overlay-collapsed')
            ) {
              setMenuVisible(!menuVisible)
            } else {
              onOpenDappletAction(p.tabId) && setMenuVisible(false)
            }
          }}
          className={cn(styles.tab, p.classNameTab, {
            [styles.tabNotActive]: !p.isActive,
            // [styles.menuWidgets]: !p.pinned && menuVisible
            // [styles.isOpenWallet]: p.isOpenWallet,
          })}
        >
          {!p.pinned &&
          menuVisible &&
          // p.menuWidgets.length &&
          document
            .querySelector('#dapplets-overlay-manager')
            .classList.contains('dapplets-overlay-collapsed') ? (
            <div ref={nodeVisibleMenu} className={styles.menuWidgets}>
              {p.getWigetsConstructor(p.menuWidgets, true)}
              <div
                className={cn(styles.delimeterMenuWidgets, {
                  [styles.invisibleDelimeter]: !p.menuWidgets.length,
                })}
              ></div>
              <div className={styles.blockStandartFunction}>
                {/* <SquaredButton
                    style={{ cursor: 'auto' }}
                    className={styles.squaredButtonMenuWidget}
                    data-visible
                    disabled={true}
                    appearance={'big'}
                    icon={Help}
                  /> */}
                <SquaredButton
                  className={styles.squaredButtonMenuWidget}
                  data-visible
                  appearance={'big'}
                  icon={HomeIcon}
                  disabled={isHome ? false : true}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuVisible(!menuVisible)
                    onOpenDappletAction(p.tabId)
                  }}
                />
                <SquaredButton
                  className={styles.squaredButtonMenuWidget}
                  data-visible
                  appearance={'big'}
                  icon={SettingsIcon}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuVisible(!menuVisible)
                    p.navigate(`/${p.tabId}/settings`)
                    p.onToggleClick()
                  }}
                />
                <SquaredButton
                  className={styles.squaredButtonMenuWidget}
                  data-visible
                  appearance={'big'}
                  icon={Store}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onOpenStore(p.tabId)
                  }}
                />
                {/* <SquaredButton
                    style={{ cursor: 'auto' }}
                    className={styles.squaredButtonMenuWidget}
                    data-visible
                    disabled={true}
                    appearance={'big'}
                    icon={Pause}
                  /> */}
              </div>
            </div>
          ) : null}
          <div className={styles.top}>
            {p.icon && typeof p.icon === 'function' ? null : p.icon && // /> //   })} //     [styles.cursor]: !p.isActive, //   className={cn(styles.image, { //   }} //     !p.isActive && p.onTabClick() //   onClick={() => { // <p.icon
              typeof p.icon === 'object' &&
              'moduleName' in p.icon ? (
              <ModuleIcon
                className={cn(
                  styles.image,
                  {
                    [styles.cursor]: !p.isActive,
                  },
                  p.classNameIcon
                )}
                moduleName={p.icon.moduleName}
                registryUrl={p.icon.registryUrl}
              />
            ) : (
              <StorageRefImage
                className={cn(
                  styles.image,
                  {
                    [styles.cursor]: !p.isActive,
                  },
                  p.classNameIcon
                )}
                storageRef={p.icon as any}
              />
            )}
          </div>

          {
            // p.isActive &&
            p.pinned && visibleMenus.length > 0 && (
              <ul
                className={cn(
                  styles.list,
                  {
                    [styles.listNotPadding]: typeof p.icon === 'function',
                  },
                  p.classNameList
                )}
              >
                {visibleMenus.map((menu) => {
                  return (
                    <li
                      data-testid={`system-tab-${menu.title.toLowerCase()}`}
                      key={menu.id}
                      title={menu.title}
                      onClick={(e) => {
                        e.preventDefault
                        e.stopPropagation()

                        if (
                          document
                            .querySelector('#dapplets-overlay-manager')
                            .classList.contains('dapplets-overlay-collapsed')
                        ) {
                          // todo: uncomment when main menu will be works
                          // menu.id === 'dapplets' && setMenuVisible(!menuVisible)

                          if (p.pathname === '/system/dapplets') {
                            p.onToggleClick()
                          } else {
                            //todo: uncomment when main menu will be works
                            // p.navigate('/system/dapplets')
                            //todo: remove when main menu will be works

                            p.onToggleClick()
                          }

                          // menuVisible && setMenuVisible()
                        } else {
                          if (menu.id === 'dapplets') {
                            if (p.pathname === '/system/dapplets') {
                              p.onToggleClick()
                            } else {
                              p.navigate('/system/dapplets')
                            }
                          } else {
                            p.pinned &&
                              visibleMenus.length > 0 &&
                              visibleMenus.map((menu) => p.onMenuClick(menu))

                            setMenuVisible(false)
                            onOpenDappletAction(p.tabId)
                          }
                        }
                      }}
                      className={cn(
                        styles.item,
                        {
                          [styles.selected]: p.activeTabMenuId === menu.id,
                        },
                        p.classNameItem
                      )}
                    >
                      {menu.id === 'connectedAccounts' ? (
                        menu.icon && typeof menu.icon === 'function' ? (
                          p.selectedWallet && p.isToolbar ? (
                            <StorageRefImage storageRef={getIconSelectedWallet() as any} />
                          ) : (
                            <menu.icon />
                          )
                        ) : menu.icon &&
                          typeof menu.icon === 'object' &&
                          'moduleName' in menu.icon ? (
                          <ModuleIcon
                            moduleName={menu.icon.moduleName}
                            registryUrl={menu.icon.registryUrl}
                          />
                        ) : (
                          <StorageRefImage storageRef={menu.icon as any} />
                        )
                      ) : menu.icon && typeof menu.icon === 'function' ? (
                        menu.id === 'notifications' && event.length > 0 ? (
                          <Event data-testid="notification-page" />
                        ) : (
                          <menu.icon />
                        )
                      ) : menu.icon &&
                        typeof menu.icon === 'object' &&
                        'moduleName' in menu.icon ? (
                        <ModuleIcon
                          moduleName={menu.icon.moduleName}
                          registryUrl={menu.icon.registryUrl}
                        />
                      ) : (
                        <StorageRefImage storageRef={menu.icon as any} />
                      )}
                    </li>
                  )
                })}
                {/* {p.pinned &&
                  menuVisible &&
                  document
                    .querySelector('#dapplets-overlay-manager')
                    .classList.contains('dapplets-overlay-collapsed') && (
                    <ul data-testid="main-menu-actions" className={styles.mainMenu}>
                      <li onClick={connectWallet} className={styles.mainMenuItem}>
                        <span className={styles.mainMenuItemTitle}>Log in to extension</span>
                        <span className={styles.mainMenuItemIcon}>
                          <Login />
                        </span>
                      </li>
                      <li
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          p.navigate(`/system/connectedAccounts`)
                          p.onToggleClick()
                          setMenuVisible(false)
                        }}
                        className={styles.mainMenuItem}
                      >
                        <span className={styles.mainMenuItemTitle}>Connected Accounts</span>
                        <span className={styles.mainMenuItemIcon}>
                          <Account />
                        </span>
                      </li>
                      <li
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          p.onToggleClick()
                          p.navigate(`/system/notifications`)

                          setMenuVisible(false)
                        }}
                        className={styles.mainMenuItem}
                      >
                        <span className={styles.mainMenuItemTitle}>Notifications</span>
                        <span className={styles.mainMenuItemIcon}>
                          <NotificationIcon />
                        </span>
                      </li>
                     
                      <li className={styles.mainMenuItem}>
                    <span className={styles.mainMenuItemTitle}>Disable dapplets on this page</span>
                    <span className={styles.mainMenuItemIcon}>
                      <Power />
                    </span>
                  </li> 
                      <li
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          p.onToggleClick()
                          p.navigate(`/system/dapplets`)

                          setMenuVisible(false)
                        }}
                        className={styles.mainMenuItem}
                      >
                        <span className={styles.mainMenuItemTitle}>Maximize extension</span>
                        <span className={styles.mainMenuItemIcon}>
                          <Max />
                        </span>
                      </li>
                      <li className={styles.mainMenuItem}>
                    <span className={styles.mainMenuItemTitle}>Edit lists</span>
                    <span className={styles.mainMenuItemIcon}>
                      <Edit />
                    </span>
                  </li> 
                    </ul>
                  )} */}
              </ul>
            )
          }
        </div>
      ) : null}
    </>
  )
}
