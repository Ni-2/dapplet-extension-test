import React, { useEffect, useState } from "react"
import { Dropdown } from "../../components/Dropdown"
import { DROPDOWN_LIST } from "../../components/Dropdown/dropdown-list"
import { initBGFunctions } from "chrome-extension-message-wrapper";
import styles from './Dapplets.module.scss';
import { Dapplet } from "../../components/Dapplet";
import ManifestDTO from "../../../../../background/dto/manifestDTO";
import { ManifestAndDetails } from "../../../../../popup/components/dapplet";
import { browser } from "webextension-polyfill-ts";
import { rcompare } from "semver";
import { CONTEXT_ID_WILDCARD, ModuleTypes } from "../../../../../common/constants";
import VersionInfo from "../../../../../background/models/versionInfo";
import ModuleInfo from "../../../../../background/models/moduleInfo";

export type Module = ManifestDTO & { isLoading: boolean, error: string, versions: string[] };

let _isMounted = false;

export const Dapplets = () => {
	const [dapplets, setDapplets] = useState<ManifestAndDetails[]>([]);
	const [isLoading, setLoading] = useState<boolean>(null);
	const [error, setError] = useState<string>(null);
	const [isNoContentScript, setNoContentScript] = useState<boolean>(null);
	const [devMessage, setDevMessage] = useState<string>(null);

	useEffect(() => {
		_isMounted = true;
		const init = async () => {
			const { getFeaturesByHostnames, getCurrentContextIds } = await initBGFunctions(browser);
			const ids = await getCurrentContextIds();
			const d = await getFeaturesByHostnames(ids);
			setDapplets(d);
		}
		init();

		return () => {
			_isMounted = false;
		}
	}, []);

	const onSwitchChange = async (module: Module, isActive?, order?, selectVersions?: boolean) => {
		const { name } = module;

		if (selectVersions && isActive) {
			_updateFeatureState(name, { isLoading: true });
			const { getVersions } = await initBGFunctions(browser);
			const allVersions = await getVersions(module.sourceRegistry.url, module.name);
			_updateFeatureState(name, { versions: allVersions, isLoading: false });
			return;
		} else {
			await toggleFeature(module, null, isActive, order, null);
		}
	}

	const toggleFeature = async (module: (ManifestDTO & { isLoading: boolean, error: string, versions: string[] }), version: string | null, isActive: boolean, order: number, allVersions: string[] | null) => {
		const { name, hostnames, sourceRegistry } = module;
		const {
			getCurrentContextIds,
			getVersions,
			activateFeature,
			deactivateFeature
		} = await initBGFunctions(browser);

		_updateFeatureState(name, { isActive, isLoading: true });

		if (!version || !allVersions) {
			allVersions = await getVersions(module.sourceRegistry.url, module.name);
			version = allVersions.sort(rcompare)[0];
		}

		_updateFeatureState(name,
			{
				isActive,
				isLoading: true,
				error: null,
				ersions: [],
				activeVersion: (isActive) ? version : null,
				lastVersion: allVersions.sort(rcompare)[0]
			});

		const isEverywhere = true;
		const targetContextIds = isEverywhere ? [CONTEXT_ID_WILDCARD] : hostnames;

		try {
			if (isActive) {
				await activateFeature(name, version, targetContextIds, order, sourceRegistry.url);
			} else {
				await deactivateFeature(name, version, targetContextIds, order, sourceRegistry.url);
			}

			await _refreshDataByContext(await getCurrentContextIds());

		} catch (err) {
			_updateFeatureState(name, { isActive: !isActive, error: err.message });
		}

		_updateFeatureState(name, { isLoading: false });
	}

	const _updateFeatureState = (name: string, f: any) => {
		const newDapplets = dapplets.map(feature => {
			if (feature.name == name) {
				Object.entries(f).forEach(([k, v]) => feature[k] = v);
			}
			return feature;
		});

		setDapplets(newDapplets);
	}

	const _refreshDataByContext = async (contextIds: Promise<string[]>) => {
		let contextIdsValues = undefined;

		try {
			contextIdsValues = await contextIds;
		} catch (err) {
			console.error(err);
			setNoContentScript(true);
			setLoading(false);
			return;
		}

		const { getFeaturesByHostnames, getRegistries } = await initBGFunctions(browser);

		const features: ManifestDTO[] = (contextIdsValues) ? await getFeaturesByHostnames(contextIdsValues) : [];

		const registries = await getRegistries();
		const regsWithErrors = registries.filter(r => !r.isDev && !!r.isEnabled && !!r.error);
		if (regsWithErrors.length > 0) {
			const isProviderProblems = regsWithErrors.filter(({ error }) =>
				error.includes('missing response') ||
				error.includes('could not detect network') ||
				error.includes('resolver or addr is not configured for ENS name') ||
				error.includes('invalid contract address or ENS name')
			).length > 0;

			const description = isProviderProblems ?
				'It looks like the blockchain provider is not available. Check provider addresses in the settings, or try again later.' :
				'Please check the settings.';

			setError(
				`Cannot connect to the Dapplet Registry (${regsWithErrors.map(x => x.url).join(', ')}).\n${description}`
			);
		}


		if (_isMounted) {
			const d = features.filter(f => f.type === ModuleTypes.Feature)
				.map(f => ({ ...f, isLoading: false, isActionLoading: false, isHomeLoading: false, error: null, versions: [] }));

			setDapplets(d);
			setLoading(false);
		}
	}

	const onOpenSettingsModule = async (mi: ManifestDTO) => {
		const { openSettingsOverlay } = await initBGFunctions(browser);
		await openSettingsOverlay(mi);
		window.close();
	}

	const onOpenDappletAction = async (f: ManifestAndDetails) => {
		try {
			_updateFeatureState(f.name, { isActionLoading: true });
			const { openDappletAction, getCurrentTab } = await initBGFunctions(browser);
			const tab = await getCurrentTab();
			if (!tab) return;
			await openDappletAction(f.name, tab.id);
			window.close();
		} catch (err) {
			console.error(err);
		} finally {
			_updateFeatureState(f.name, { isActionLoading: false });
		}
	}

	const onRemoveDapplet = async (f: ManifestAndDetails) => {
		const { removeDapplet, getCurrentContextIds } = await initBGFunctions(browser);
		const contextIds = await getCurrentContextIds();
		await removeDapplet(f.name, contextIds);
		const d = dapplets.filter(x => x.name !== f.name);
		setDapplets(d);
	}

	const onDeployDapplet = async (f: ManifestAndDetails) => {
		console.log("f", f);
		const { openDeployOverlay } = await initBGFunctions(browser);

		// TODO: activeVersion or lastVersion
		await openDeployOverlay(f, f.activeVersion);
		window.close();
	}

	return (
		<>
			<div className={styles.wrapper}>
				<Dropdown
					list={DROPDOWN_LIST}
					title="Sort by:"
					style={{ marginRight: 10 }}
				/>
				<Dropdown
					list={DROPDOWN_LIST}
					title="Worklist:"
				/>
			</div>
			{dapplets && dapplets.map((dapplet) => {
				return (
					<Dapplet
						key={dapplet.name}
						dapplet={{
							...dapplet,
							isFavourites: false,
							website: 'dapplets.com',
							users: [],
						}}
						onSwitchChange={onSwitchChange}
						onSettingsModule={onOpenSettingsModule}
						onOpenDappletAction={onOpenDappletAction}
						onRemoveDapplet={onRemoveDapplet}
						onDeployDapplet={onDeployDapplet}
					/>
				)
			})}
		</>
	)
}
