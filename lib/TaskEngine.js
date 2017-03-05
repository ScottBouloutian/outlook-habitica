'use strict';

const Outlook = require('./Outlook');

class TaskEngine {
    constructor(options) {
        this.outlook = new Outlook({
            clientId: options.outlook.clientId,
            clientSecret: options.outlook.clientSecret,
            token: options.tokenInfo.token,
        });
    }

    handleOutlookTaskCreate(id) {
        console.log(`Outlook task ${id} was created`);
        return this.outlook.getTask(id).then(task => console.log(task));
    }

    handleOutlookTaskUpdate(id) {
        console.log(`Outlook task ${id} was updated`);
        return Promise.resolve();
    }

    handleOutlookTaskDelete(id) {
        console.log(`Outlook task ${id} was deleted`);
        return Promise.resolve();
    }

    handleOutlookNotification(notification) {
        const id = notification.ResourceData.Id;
        switch (notification.ChangeType) {
        case 'Created':
            return this.handleOutlookTaskCreate(id);
        case 'Updated':
            return this.handleOutlookTaskUpdate(id);
        case 'Deleted':
            return this.handleOutlookTaskDelete(id);
        default:
            return Promise.resolve();
        }
    }
}
module.exports = TaskEngine;
