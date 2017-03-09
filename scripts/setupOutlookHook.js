/*
    This script sends a subscription request to enable a webhook for Outlook.
 */

'use strict';

const configUtils = require('../lib/configUtils');
const ld = require('lodash');
const Outlook = require('../lib/Outlook');

configUtils.downloadConfig().then((config) => {
    const outlook = new Outlook({
        clientId: config.outlook.clientId,
        clientSecret: config.outlook.clientSecret,
        token: config.tokenInfo.token,
    });
    return outlook.createSubscription(config.outlook.webhook).then((subscription) => {
        ld.assign(config, {
            subscription: { id: subscription.Id },
        });
        return configUtils.uploadConfig(config);
    });
}).catch(error => console.error(error));
