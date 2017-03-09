/*
    This script sends a subscription request to enable a webhook for Outlook.
 */

'use strict';

const configUtils = require('../lib/configUtils');
const ld = require('lodash');
const Habitica = require('../lib/Habitica');

configUtils.downloadConfig().then((config) => {
    const habitica = new Habitica(config.habitica);
    return habitica.createWebhook().then((webhook) => {
        ld.assign(config.habitica, {
            webhookId: webhook.id,
        });
        return configUtils.uploadConfig(config);
    });
}).catch(error => console.error(error));
