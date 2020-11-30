import * as ethers from "ethers";
import { browser } from "webextension-polyfill-ts";
import { initBGFunctions } from "chrome-extension-message-wrapper";

export class ProxySigner extends ethers.Signer {
    public provider = new ethers.providers.Web3Provider((method, params) => initBGFunctions(browser).then(f => f.fetchJsonRpc(method, params)));

    constructor(private _app: string) {
        super();
    }

    connect(provider: ethers.ethers.providers.Provider): ethers.ethers.Signer {
        throw new Error("Method not implemented.");
    }

    async getAddress(): Promise<string> {
        const { getAddress } = await initBGFunctions(browser);
        return getAddress(this._app);
    }

    async signMessage(message: ethers.utils.BytesLike): Promise<string> {
        throw new Error("Method not implemented.");
    }    

    async signTransaction(transaction: ethers.providers.TransactionRequest): Promise<string> {
        throw new Error("Method not implemented.");
    }

    async sendTransaction(transaction: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionResponse> {
        const { sendTransactionOutHash } = await initBGFunctions(browser);
        const txHash = await sendTransactionOutHash(this._app, transaction);
        return this.provider.getTransaction(txHash);
    }
}