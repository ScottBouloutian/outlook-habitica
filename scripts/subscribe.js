/*
    This script sends a subscription request to enable a webhook for Outlook.
 */

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const uuid = require('uuid');
const configUtils = require('../lib/configUtils');
const ld = require('lodash');

configUtils.downloadConfig().then(config => (
    request({
        method: 'post',
        uri: 'https://outlook.office.com/api/v2.0/me/subscriptions',
        headers: {
            Authorization: `Bearer ${config.tokenInfo.token}`,
        },
        json: {
            '@odata.type': '#Microsoft.OutlookServices.PushSubscription',
            Resource: 'https://outlook.office.com/api/v2.0/me/tasks',
            NotificationURL: config.outlook.webhook,
            ChangeType: 'Created, Updated, Deleted',
            ClientState: uuid(),
        },
    }).then((response) => {
        if (response.statusCode !== 201) {
            throw new Error(`code ${response.statusCode}`);
        }
        ld.assign(config, {
            subscription: {
                id: response.body.Id,
                clientState: response.body.clientState,
                expires: response.body.SubscriptionExpirationDateTime,
            },
        });
        return configUtils.uploadConfig(config);
    })
)).catch(error => console.error(error));
