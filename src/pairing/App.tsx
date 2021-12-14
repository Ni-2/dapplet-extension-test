import * as React from 'react';
import { SelectWallet } from "./components/selectWallet";
import '../common/semantic-ui-css/semantic.min.css';
import './index.scss';
import { HashRouter, Route, Switch } from "react-router-dom";
import { Bus } from '../common/bus';
import * as modules from './modules';
import { Container } from 'semantic-ui-react';
import { ChainTypes } from '../common/types';

interface Props {
    bus: Bus;
    chains: ChainTypes[];
}

interface State {
}

export class App extends React.Component<Props, State> {
    render() {
        const p = this.props; 

        return (
            <Container text style={{ paddingTop: '30px' }}>
                <HashRouter>
                    <Switch>
                        <Route exact path="/" component={() => <SelectWallet bus={p.bus} chains={p.chains} />} />
                        <Route path="/metamask" component={() => <modules.metamask bus={p.bus} />} />
                        <Route path="/walletconnect" component={() => <modules.walletconnect bus={p.bus} />} />
                        <Route path="/near_testnet" component={() => <modules.near bus={p.bus} chain={ChainTypes.NEAR_TESTNET} />} />
                        <Route path="/near_mainnet" component={() => <modules.near bus={p.bus} chain={ChainTypes.NEAR_MAINNET} />} />
                        <Route path="/dapplets" component={() => <modules.dapplets bus={p.bus} />} />
                    </Switch>
                </HashRouter>
            </Container>
        );
    }
}