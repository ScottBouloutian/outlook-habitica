const configUtils = require('./lib/configUtils');
const ld = require('lodash');
const Outlook = require('./lib/Outlook');
const TaskEngine = require('./lib/TaskEngine');
const Promise = require('bluebird');

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

    outlookWebhook(event, context, callback) {
        // Log the event
        console.log(event);

        // Validate the subscription request
        const query = event.params.querystring;
        if ('validationtoken' in query) {
            console.log('Validating the subscription request');
            callback(null, query.validationtoken);
            return Promise.resolve();
        }

        // Handle the notification
        const notifications = event['body-json'].value;
        return configUtils.downloadConfig().then((config) => {
            const taskEngine = new TaskEngine(config);
            return Promise.map(notifications, notification =>
                taskEngine.handleOutlookNotification(notification));
        }).then(() => callback(null));
    },

    habiticaWebhook(event, context, callback) {
        // Log the event
        console.log(event);

        // Handle the notification
        return configUtils.downloadConfig().then((config) => {
            const taskEngine = new TaskEngine(config);
            return taskEngine.handleHabiticaNotification(event);
        }).then(() => callback(null));
    },
};
