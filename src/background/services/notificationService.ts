import * as extension from 'extensionizer';

const generateGuid = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

const transactionCreated = async transactionId => {
    return new Promise(function (resolve, reject) {
        extension.notifications.create(
            transactionId,
            {
                type: "basic",
                iconUrl: "icon128.png",
                title: "Transaction created",
                message: "Сlick to check the status on Etherscan"
            },
            resolve
        );
    });
};

const transactionRejected = async () => {
    return new Promise(function (resolve, reject) {
        extension.notifications.create(
            generateGuid(),
            {
                type: "basic",
                iconUrl: "icon128.png",
                title: "Transaction rejected",
                message: "Try again if you didn't reject it"
            },
            resolve
        );
    });
};

export { transactionCreated, transactionRejected };
