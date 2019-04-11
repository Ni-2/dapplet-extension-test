import "../resources/img/icon-128.png";
import "../resources/img/icon-34.png";

import WalletConnect from "@walletconnect/browser";
import { setupMessageListener } from "chrome-extension-message-wrapper";
import Storage from "../utils/chrome-extension-storage-wrapper";

const bridge = "https://bridge.walletconnect.org";

var walletConnector;

try {
  walletConnector = new WalletConnect({ bridge });
  walletConnector.on("disconnect", (error, payload) => {
    if (error) {
      throw error;
    }

    localStorage.clear();
    console.log("wallet disconnected, localstorage cleaned"); // tslint:disable-line
  });
} catch (ex) {
  console.error(ex);
}

/* Extension Messaging Functions */

/**
 * Returns connection status of WalletConnect
 * @returns {boolean} Is connected?
 */
const checkConnection = () => {
  return walletConnector.connected;
};

/**
 * Returns URI of WalletConnect's session
 * @async
 * @returns {Promise<string>} Promise represents session URI
 */
const generateUri = async () => {
  await walletConnector.killSession();
  await walletConnector.createSession();
  const uri = walletConnector.uri;
  return uri;
};

/**
 * Runs Dapplet inside paired wallet and returns transaction result
 * @async
 * @param {string} dappletId Dapplet ID
 * @param {object} metaTx Metadata
 * @returns {Promise<object>} Promise represents transaction result
 */
const loadDapplet = async (dappletId, metaTx) => {
  try {
    const result = await walletConnector.loadDapplet(dappletId, metaTx);
    return result;
  } catch {
    return null;
  }
};

/**
 * Returns pairing result.
 * @async
 * @returns {Promise<object>} Promise object represents the result of WalletConnect pairing
 */
const waitPairing = () => {
  var promise = new Promise(function(resolve, reject) {
    walletConnector.on("connect", (error, payload) => {
      if (error) {
        reject(error);
      }

      resolve(true);
    });
  });

  return promise;
};

/**
 * Returns activated injectors by passed hostname
 * @async
 * @param {string} hostname 
 * @returns {Promise<Array<object>>} Promise represents array of objects with manifests of injectors
 */
const getActiveInjectorsByHostname = async hostname => {
  var injectors = (await Storage.getLocal("injectors/" + hostname)) || {};
  return Object.values(injectors);
};

/**
 * Returns all injectors by passed hostname with isActive and hasUpdated statuses
 * @async
 * @param {string} hostname 
 * @returns {Promise<Array<object>>} Promise represents array of injector's manifests
 */
const getInjectorsByHostname = async hostname => {
  var activeInjectors = (await Storage.getLocal("injectors/" + hostname)) || {};
  var externalInjectors = [];

  // TODO replace static json to api
  try {
    var response = await fetch("/resources/" + hostname + ".json");
    var json = await response.json();

    externalInjectors = json.data;
  } catch {
    try {
      var response = await fetch("/resources/twitter.com.json");
      var json = await response.json();

      externalInjectors = json.data;
    } catch {
      externalInjectors = [];
    }
  }

  for (var i = 0; i < externalInjectors.length; i++) {
    if (!externalInjectors[i]) {
      console.error("Invalid external injector");
      continue;
    }

    if (!externalInjectors[i].id) {
      console.error(
        "External injector doesn't have an id.",
        externalInjectors[i]
      );
      continue;
    }

    var matchedActiveInjector = activeInjectors[externalInjectors[i].id];

    if (matchedActiveInjector) {
      externalInjectors[i].isActive = true;

      if (!externalInjectors[i].version) {
        console.error(
          "External injector doesn't have a version.",
          externalInjectors[i]
        );
      } else {
        // TODO check correct version
        externalInjectors[i].hasUpdate =
          matchedActiveInjector.version != externalInjectors[i].version;
      }
    } else {
      externalInjectors[i].isActive = false;
      externalInjectors[i].hasUpdate = false;
    }
  }

  // TODO if an external injector doesn't exist in api, but exists in active list, then it will not be displayed at popup

  console.log("Injectors for " + hostname, externalInjectors);

  return externalInjectors;
};

/**
 * Adds or remove injector to (from) activated list by passed hostname
 * @async
 * @param {object} injector Manifest of injector
 * @param {string} hostname 
 * @param {boolean} isActive Add or remove?
 * @returns {Promise<void>}
 */
const setActiveInjector = async (injector, hostname, isActive) => {
  if (!injector || !injector.id) {
    throw "invalid injector";
  }

  var injectors = (await Storage.getLocal("injectors/" + hostname)) || {};

  if (isActive) {
    console.log("Adding injector to " + hostname, injector);
    injectors[injector.id] = injector;
  } else {
    console.log("Removing injector from " + hostname, injector);
    delete injectors[injector.id];
  }

  await Storage.setLocal("injectors/" + hostname, injectors);
  console.log("Active injectors for " + hostname, injectors);
};

chrome.runtime.onMessage.addListener(
  setupMessageListener({
    loadDapplet,
    generateUri,
    checkConnection,
    waitPairing,
    getInjectorsByHostname,
    getActiveInjectorsByHostname,
    setActiveInjector
  })
);

