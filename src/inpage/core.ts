import { initBGFunctions } from "chrome-extension-message-wrapper";
import { OverlayManager } from "./overlayManager";
import { Overlay, SubscribeOptions } from "./overlay";
import * as extension from 'extensionizer';
import { Swiper } from "./swiper";
import * as GlobalEventBus from './globalEventBus';
import { AutoProperties, EventDef, Connection } from "./connection";
import { WsJsonRpc } from "./wsJsonRpc";
import { IPubSub } from "./types";

export default class Core {

    public overlayManager = new OverlayManager();
    private _popupOverlay: Overlay = null;

    constructor() {
        extension.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message === "OPEN_PAIRING_OVERLAY") {
                this.waitPairingOverlay().finally(() => sendResponse());
            } else if (message === "OPEN_DEPLOY_OVERLAY") {
                this.waitDeployOverlay().finally(() => sendResponse());
            }
            else if (message === "TOGGLE_OVERLAY") {
                this._togglePopupOverlay();
                sendResponse();
            }
        });

        const swiper = new Swiper(document.body);
        swiper.on("left", () => {
            if (this._popupOverlay == null) {
                this._togglePopupOverlay()
            } else {
                this._popupOverlay.open()
            }
        });
        swiper.on("right", () => {
            this.overlayManager.close();
        });
    }

    public publish = (topic: string, data: any) => GlobalEventBus.publish(topic, data)
    public subscribe = (topic: string, func: Function) => GlobalEventBus.subscribe(topic, func)

    public waitPairingOverlay(): Promise<void> {
        const me = this;
        return new Promise<void>((resolve, reject) => {
            const pairingUrl = extension.extension.getURL('pairing.html');
            const overlay = new Overlay(this.overlayManager, pairingUrl, 'Wallet');
            overlay.open();
            // ToDo: add timeout?
            overlay.onmessage = (topic, message) => {
                if (topic === 'ready') {
                    overlay.close();
                    resolve();
                }

                if (topic === 'error') {
                    reject();
                }
            }
        });
    }

    public waitDeployOverlay(): Promise<void> {
        const me = this;
        return new Promise<void>((resolve, reject) => {
            const pairingUrl = extension.extension.getURL('deploy.html');
            const overlay = new Overlay(this.overlayManager, pairingUrl, 'Deploy');
            overlay.open();
            // ToDo: add timeout?
            overlay.onmessage = (topic, message) => {
                if (topic === 'ready') {
                    overlay.close();
                    resolve();
                }

                if (topic === 'error') {
                    reject();
                }
            }
        });
    }

    public _togglePopupOverlay() {
        if (!this._popupOverlay?.registered) {
            const pairingUrl = extension.extension.getURL('popup.html');
            this._popupOverlay = new Overlay(this.overlayManager, pairingUrl, 'Dapplets');
            this._popupOverlay.open();
        } else {
            this.overlayManager.toggle();
        }
    }

    private async _sendWalletConnectTx(dappletId, metadata, callback: (e: { type: string, data?: any }) => void): Promise<any> {
        const backgroundFunctions = await initBGFunctions(extension);
        const {
            loadDapplet,
            loadDappletFrames,
            transactionCreated,
            transactionRejected,
            checkConnection,
            getGlobalConfig,
            sendLegacyTransaction
        } = backgroundFunctions;

        const isConnected = await checkConnection();

        const me = this;

        if (!isConnected) {
            callback({ type: "PAIRING" });
            await this.waitPairingOverlay();
            callback({ type: "PAIRED" });
        }

        callback({ type: "PENDING" });

        let dappletResult = null;

        const { walletInfo } = await getGlobalConfig();

        if (walletInfo.protocolVersion === "0.2.0") {
            console.log("Wallet is Dapplet Frames compatible. Sending Dapplet Frames transaction...");
            dappletResult = await loadDappletFrames(dappletId, metadata);
        } else if (walletInfo.protocolVersion === "0.1.0") {
            console.log("Wallet is Dapplet compatible. Sending Dapplet transaction...");
            dappletResult = await loadDapplet(dappletId, metadata);
        } else {
            console.log("Wallet is Dapplet incompatible. Showing dapplet view...");

            const waitApproving = function (): Promise<void> {
                return new Promise<void>((resolve, reject) => {
                    const pairingUrl = extension.extension.getURL('dapplet.html');
                    const overlay = new Overlay(me.overlayManager, pairingUrl, 'Dapplet');
                    // ToDo: implement multiframe
                    overlay.open(() => overlay.send('txmeta', [dappletId, metadata]));
                    // ToDo: add timeout?
                    overlay.onMessage((topic, message) => {
                        if (topic === 'approved') {
                            resolve();
                            overlay.close();
                        }

                        if (topic === 'error') {
                            reject();
                            overlay.close();
                        }
                    });
                });
            };

            await waitApproving();
            dappletResult = await sendLegacyTransaction(dappletId, metadata);
        }

        if (dappletResult) {
            transactionCreated(dappletResult);
            callback({ type: "CREATED", data: dappletResult });
        } else {
            transactionRejected();
            callback({ type: "REJECTED" });
        }

        return dappletResult;
    }

    public connect<M>(cfg: { url: string }, eventDef?: EventDef<any>): AutoProperties<M> & Connection {
        const rpc = new WsJsonRpc(cfg.url);
        const conn = Connection.create<M>(rpc, eventDef);
        return conn;
    }

    public wallet<M>(cfg?: { }, eventDef?: EventDef<any>): AutoProperties<M> & Connection {
        const me = this;
        const transport = {
            _txCount: 0,
            _handler: null,
            exec: (dappletId: string, ctx: any) => {
                const id = ++transport._txCount;
                me._sendWalletConnectTx(dappletId, ctx, (e) => transport._handler(id, e));
                return new Promise((resolve, reject) => resolve(id));
            },
            onMessage: (handler: (topic: string, message: any) => void) => {
                transport._handler = handler;
                return {
                    off: () => transport._handler = null
                }
            }
        }

        const conn = Connection.create<M>(transport, eventDef);
        return conn;
    }

    public overlay<M>(cfg: { url: string, title: string }, eventDef?: EventDef<any>): AutoProperties<M> & Connection {
        const _overlay = new Overlay(this.overlayManager, cfg.url, cfg.title);
        const conn = Connection.create<M>(_overlay, eventDef);
        return conn;
    }

    // ToDo: remove it or implement!
    contextStarted(contextIds: any[], parentContext?: string): void { }
    contextFinished(contextIds: any[], parentContext?: string): void { }
}