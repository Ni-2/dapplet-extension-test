import { initBGFunctions } from 'chrome-extension-message-wrapper'
import cn from 'classnames'
import React, { ReactElement } from 'react'
import { browser } from 'webextension-polyfill-ts'
import { StorageRef } from '../../../../../common/types'
import { StorageRefImage } from '../../components/StorageRefImage'
import { ToolbarTabMenu } from '../../types'
import { ModuleIcon, ModuleIconProps } from '../ModuleIcon'
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
}

export const OverlayTab = (p: OverlayTabProps): ReactElement => {
  const visibleMenus = p.menus.filter((x) => x.hidden !== true)
  // const _handleCloseClick: React.MouseEventHandler<HTMLSpanElement> = (e) => {
  //   e.preventDefault()
  //   e.stopPropagation()
  //   p.onCloseClick()
  // }

  const onOpenDappletAction = async (f: string) => {
    if (!p.modules) return
    let y

    p.modules
      .filter((x) => x.name === f)
      .map((x) => {
        if (x.isActionHandler) return (y = true)
        else {
          y = false
        }
      })

    if (y) {
      try {
        const { openDappletAction, getCurrentTab } = await initBGFunctions(browser)
        const tab = await getCurrentTab()
        if (!tab) return
        await openDappletAction(f, tab.id).then(() => p.navigate!(`/${f}/${p.activeTabMenuId}`))
      } catch (err) {
        console.error(err)
      }
    } else {
      p.onTabClick()
    }
  }

  return (
    <div
      // onClick={() => {
      //   !p.isActive && p.onTabClick()

      //   // p.setOpenWallet()
      // }}
      className={cn(styles.tab, p.classNameTab, {
        [styles.tabNotActive]: !p.isActive,
        [styles.isOpenWallet]: p.isOpenWallet,
      })}
    >
      <div className={styles.top}>
        {p.icon && typeof p.icon === 'function' ? null : p.icon && // /> //   })} //     [styles.cursor]: !p.isActive, //   className={cn(styles.image, { //   }} //     !p.isActive && p.onTabClick() //   onClick={() => { // <p.icon
          typeof p.icon === 'object' &&
          'moduleName' in p.icon ? (
          <ModuleIcon
            onClick={() => {
              // onOpenDappletAction(p.tabId)
              !p.isActive && p.onTabClick()
              // console.log(p.isActive);
            }}
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
            onClick={() => {
              !p.isActive && p.onTabClick()
              // console.log(p.isActive);

              //  onOpenDappletAction(p.tabId)
            }}
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
        {/* {!p.pinned && (
          <span className={cn(styles.close, p.classNameClose)} onClick={_handleCloseClick}>
            <Close />
          </span>
        )} */}
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
                  key={menu.id}
                  title={menu.title}
                  onClick={() => p.onMenuClick(menu)}
                  className={cn(
                    styles.item,
                    {
                      [styles.selected]: p.activeTabMenuId === menu.id,
                    },
                    p.classNameItem
                  )}
                >
                  {menu.icon && typeof menu.icon === 'function' ? (
                    <menu.icon />
                  ) : menu.icon && typeof menu.icon === 'object' && 'moduleName' in menu.icon ? (
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
          </ul>
        )
      }
    </div>
  )
}
