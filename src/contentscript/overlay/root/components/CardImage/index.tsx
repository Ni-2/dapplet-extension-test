import React, { FC, useEffect, useState } from "react";
import cn from "classnames";
import { initBGFunctions } from "chrome-extension-message-wrapper";
import { ReactComponent as Star } from "../../assets/images/icon/stars.svg";
import NO_LOGO from "../../../../../common/resources/no-logo.png";


import styles from "./CardImage.module.scss";
import { StorageRef } from "../../../../../background/registries/registry";
import { browser } from "webextension-polyfill-ts";

export interface CardImageProps {
	storageRef: StorageRef;
	isFavourites: boolean;
}

export const CardImage: FC<CardImageProps> = (props: CardImageProps) => {
	const { storageRef, isFavourites } = props;
	const { img } = useStorageRef(storageRef);

	return (
		<div className={cn(styles.icon)}>
			<div className={cn(styles.img)}>
				<img src={img} alt="" />
				<span
					className={cn(styles.label, {
						[styles.true]: isFavourites,
						[styles.false]: !isFavourites,
					})}
				>
					<Star />
				</span>
			</div>
		</div>
	);
};

const useStorageRef = (storageRef: StorageRef) => {
	const [img, setImg] = useState<string>('');

	useEffect(() => {
		init();
	}, []);

	const init = async () => {
		try {
			const { getResource } = await initBGFunctions(browser);
			const base64 = await getResource(storageRef);
			const dataUri = "data:text/plain;base64," + base64;
			setImg(dataUri);
		} catch (error) {
			setImg(NO_LOGO);
		}
	}

	return { img }
}
