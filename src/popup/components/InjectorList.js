import React from "react";
import { initBGFunctions } from "chrome-extension-message-wrapper";
import store from "../store";

import { Button, Image, List, Checkbox, Grid, Label } from "semantic-ui-react";

class InjectorList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      injectors: [],
      totalCount: 0
    };
  }

  async componentDidMount() {
    var backgroundFunctions = await initBGFunctions(chrome);
    const { getInjectorsByHostname } = backgroundFunctions;

    var injectors = await getInjectorsByHostname(store.currentHostname);

    this.setState({
      injectors: injectors,
      totalCount: injectors.length
    });
  }

  async handleSwitchChange(injector, value) {
    var backgroundFunctions = await initBGFunctions(chrome);
    const { setActiveInjector } = backgroundFunctions;

    await setActiveInjector(injector, store.currentHostname, value);

    this.setState(state => {
      const injectors = state.injectors.map(item => {
        if (item.id == injector.id) {
          item.isActive = value;
          return item;
        } else {
          return item;
        }
      });

      return {
        injectors
      };
    });
  }

  render() {
    const { injectors, totalCount } = this.state;

    return (
      <List divided relaxed style={{ width: 350 }}>
        {injectors.map(injector => (
          <List.Item key={injector.id} style={{ overflow: "hidden" }}>
            <List.Content style={{ width: 45, float: "left" }}>
              <div>
                <Image
                  size="mini"
                  avatar
                  alt={injector.description}
                  src={injector.icons["128"]}
                />
              </div>
            </List.Content>
            {injector.hasUpdate ? (
              <List.Content style={{ float: "right", width: 60 }}>
                <Button primary size="mini" style={{ padding: 5, width: 55 }}>
                  Update
                </Button>
                <Button
                  size="mini"
                  style={{ padding: 5, marginTop: 5, width: 55 }}
                >
                  Skip
                </Button>
              </List.Content>
            ) : (
              <List.Content style={{ float: "right", width: 60 }}>
                <Checkbox
                  toggle
                  style={{ marginTop: 5 }}
                  onChange={() =>
                    this.handleSwitchChange(injector, !injector.isActive)
                  }
                  checked={injector.isActive}
                />
              </List.Content>
            )}
            <List.Content
              style={{
                marginLeft: 45,
                marginRight: injector.hasUpdate ? 60 : 60
              }}
            >
              <List.Header>{injector.name}</List.Header>
              <List.Description style={{ color: "#666" }}>
                {injector.description}
                <br />
                Author: {injector.author}
                <br />
                Version: {injector.version}
              </List.Description>
            </List.Content>
          </List.Item>
        ))}
      </List>
    );
  }
}

export default InjectorList;
