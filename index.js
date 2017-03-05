const configUtils = require('./lib/configUtils');
const ld = require('lodash');
const Outlook = require('./lib/Outlook');

module.exports = {
    refreshToken() {
        return configUtils.downloadConfig().then((config) => {
            const outlook = new Outlook({
                clientId: config.outlook.clientId,
                clientSecret: config.outlook.clientSecret,
                token: config.tokenInfo.token,
            });
            return outlook.refreshToken(config.tokenInfo.refreshToken).then((body) => {
                ld.assign(config, {
                    tokenInfo: {
                        token: body.access_token,
                        refreshToken: body.refresh_token,
                    },
                });
                return configUtils.uploadConfig(config);
            });
        })
        .then(() => console.log('Access token has been refreshed'))
        .catch(error => console.error(error));
    },

    renewSubscription() {
        return configUtils.downloadConfig().then((config) => {
            const outlook = new Outlook({
                clientId: config.outlook.clientId,
                clientSecret: config.outlook.clientSecret,
                token: config.tokenInfo.token,
            });
            return outlook.renewSubscription(config.subscription.id).then((body) => {
                ld.assign(config, {
                    subscription: { id: body.Id },
                });
                return configUtils.uploadConfig(config);
            });
        })
        .then(() => console.log('The subscription has been renewed'))
        .catch(error => console.error(error));
    },
};
