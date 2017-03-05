'use strict';

const Outlook = require('./Outlook');
const Habitica = require('./Habitica');
const Promise = require('bluebird');
const Dynamo = require('./Dynamo');

function mapOutlookTask(task) {
    return {
        text: task.Subject,
        type: 'todo',
    };
}

class TaskEngine {
    constructor(options) {
        this.outlook = new Outlook({
            clientId: options.outlook.clientId,
            clientSecret: options.outlook.clientSecret,
            token: options.tokenInfo.token,
        });
        this.habitica = new Habitica(options.habitica);
        this.dynamo = new Dynamo('outlook-habitica');
    }

    handleOutlookTaskCreate(id) {
        console.log(`Outlook task ${id} was created`);
        return this.outlook.getTask(id).then((task) => {
            const habiticaTask = mapOutlookTask(task);
            return this.habitica.createTask(habiticaTask);
        }).then((habiticaTask) => {
            console.log(`Created Habitica task ${habiticaTask.id}`);
            return this.dynamo.put({
                id,
                habiticaId: habiticaTask.id,
            });
        });
    }

    handleOutlookTaskUpdate(id) {
        console.log(`Outlook task ${id} was updated`);
        return Promise.all([
            this.outlook.getTask(id),
            this.dynamo.get({ id }),
        ]).then((results) => {
            const task = results[0];
            const habiticaId = results[1].habiticaId;
            return this.habitica.updateTask(habiticaId, mapOutlookTask(task)).then(() => (
                console.log(`Updated Habitica task ${habiticaId}`)
            ));
        });
    }

    handleOutlookTaskDelete(id) {
        console.log(`Outlook task ${id} was deleted`);
        return this.dynamo.get({ id }).then((item) => {
            console.log(`Deleted Habitica task ${item.habiticaId}`);
            return this.habitica.deleteTask(item.habiticaId);
        }).then(() => this.dynamo.delete({ id }));
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
