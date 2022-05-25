import React, { ReactElement } from "react";
import styles from "./OverlayTab.module.scss";
import { ReactComponent as Close } from "../../assets/svg/close.svg";
import cn from "classnames";
import { StorageRefImage } from "../DevModulesList";
import { ToolbarTabMenu } from "../../types";
import { StorageRef } from "../../../../../background/registries/registry";
import { ModuleIcon, ModuleIconProps } from "../ModuleIcon";

export interface OverlayTabProps {
    pinned: boolean;
    title: string;
    icon: string | StorageRef | React.FC<React.SVGProps<SVGSVGElement>> | ModuleIconProps;
    isActive: boolean;
    activeTabMenuId: string;
    menus: ToolbarTabMenu[];

    onTabClick: () => void;
    onCloseClick: () => void;
    onMenuClick: (menu: ToolbarTabMenu) => void;
}

export const OverlayTab = (p: OverlayTabProps): ReactElement => {
    return (
        <div
            className={cn(styles.tab, {
                [styles.tabNotActive]: !p.isActive,
            })}
        >
            <div className={styles.top}>
                {typeof p.icon === "function" ? (
                    <p.icon
                        onClick={p.onTabClick}
                        className={cn(styles.image, {
                            [styles.cursor]: !p.isActive,
                        })}
                    />
                ) : (typeof p.icon === 'object' && 'moduleName' in p.icon) ? (
                    <ModuleIcon
                        onClick={p.onTabClick}
                        className={cn(styles.image, {
                            [styles.cursor]: !p.isActive,
                        })}
                        moduleName={p.icon.moduleName}
                        registryUrl={p.icon.registryUrl}
                    />
                ) : (
                    <StorageRefImage
                        onClick={p.onTabClick}
                        className={cn(styles.image, {
                            [styles.cursor]: !p.isActive,
                        })}
                        storageRef={p.icon}
                    />
                )}
                {!p.pinned && (
                    <Close className={styles.close} onClick={p.onCloseClick} />
                )}
            </div>

            {p.isActive && p.menus.length > 0 && (
                <ul className={styles.list}>
                    {p.menus.map((menu) => {
                        return (
                            <li
                                key={menu.id}
                                title={menu.title}
                                onClick={() => p.onMenuClick(menu)}
                                className={cn(styles.item, {
                                    [styles.selected]:
                                        p.activeTabMenuId === menu.id,
                                })}
                            >
                                {typeof menu.icon === "function" ? (
                                    <menu.icon />
                                ) : (typeof menu.icon === 'object' && 'moduleName' in menu.icon) ? (
                                    <ModuleIcon moduleName={menu.icon.moduleName} registryUrl={menu.icon.registryUrl} />
                                ) : (
                                    <StorageRefImage storageRef={menu.icon} />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
