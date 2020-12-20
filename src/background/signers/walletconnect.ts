import WalletConnect from "@walletconnect/client";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import { ethers } from "ethers";
import { Deferrable } from "ethers/lib/utils";
import { ExtendedSigner } from "./interface";
import { browser } from 'webextension-polyfill-ts';
import { getCurrentTab } from '../../common/helpers';

export default class extends ethers.Signer implements ExtendedSigner {
    
    public provider = new ethers.providers.JsonRpcProvider('https://rinkeby.infura.io/v3/eda881d858ae4a25b2dfbbd0b4629992', 'rinkeby');
    private __walletconnect?: WalletConnect;

    private get _walletconnect() {
        if (!this.__walletconnect) {
            this.__walletconnect = new WalletConnect({
                bridge: "https://bridge.walletconnect.org"
            });
            this.__walletconnect.on('display_uri', (err, payload) => {
                if (err) throw err;
                const [uri] = payload.params;
                this._showQR(uri);
            });
        }

        return this.__walletconnect;
    }

    private set _walletconnect(v: any) {
        this.__walletconnect = v;
    }

    async getAddress(): Promise<string> {
        return Promise.resolve(this._walletconnect?.accounts[0] || '0x0000000000000000000000000000000000000000');
    }

    async signMessage(message: string | ethers.Bytes): Promise<string> {
        return this._walletconnect.signMessage([message]);
    }

    async signTransaction(transaction: Deferrable<TransactionRequest>): Promise<string> {
        throw new Error('Not implemented');
    }

    async sendTransaction(transaction: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionResponse> {
        const txHash = await this.sendTransactionOutHash(transaction);
        return this.provider.getTransaction(txHash);
    }

    async sendTransactionOutHash(transaction: ethers.providers.TransactionRequest): Promise<string> {
        transaction.from = await this.getAddress();
        const tx = await ethers.utils.resolveProperties(transaction);
        const txHash = await this._walletconnect.sendTransaction(tx as any);
        localStorage['walletconnect_lastUsage'] = new Date().toISOString();
        return txHash;
    }

    async sendCustomRequest(method: string, params: any[]): Promise<any> {
        return this._walletconnect.sendCustomRequest({ method, params });
    }

    connect(provider: Provider): ethers.Signer {
        throw new Error("Method not implemented.");
    }

    isConnected() {
        return this._walletconnect?.connected ?? false;
    }

    async connectWallet(): Promise<void> {
        if (this._walletconnect.connected) return;
        this._walletconnect['_handshakeTopic'] = ''; // ToDo: remove after update of WalletConnect to >1.3.1
        await this._walletconnect.createSession();

        return new Promise((resolve, reject) => {
            this._walletconnect.on('connect', (error, payload) => {
                if (error) {
                    reject(error);
                } else {
                    localStorage['walletconnect_lastUsage'] = new Date().toISOString();
                    resolve(payload);
                }
            });
        });
    }

    async disconnectWallet() {
        if (this._walletconnect?.connected) {
            await this._walletconnect.killSession();
            delete localStorage['walletconnect'];
            delete localStorage['walletconnect_lastUsage'];
            this._walletconnect = null;
        }
    }

    async getMeta() {
        const m = this._walletconnect?.peerMeta;
        return (m) ? {
            name: m.name,
            description: m.description,
            icon: m.icons[0]
        } : null;
    }

    getLastUsage() {
        return localStorage['walletconnect_lastUsage'];
    }

    private async _showQR(uri: string) {
        const activeTab = await getCurrentTab();
        const [error, result] = await browser.tabs.sendMessage(activeTab.id, {
            type: "OPEN_PAIRING_OVERLAY",
            payload: {
                topic: 'walletconnect',
                args: [uri]
            }
        });
    }
}