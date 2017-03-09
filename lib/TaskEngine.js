'use strict';

const Outlook = require('./Outlook');
const Habitica = require('./Habitica');
const Promise = require('bluebird');
const Dynamo = require('./Dynamo');
const moment = require('moment');
const htmlToText = require('html-to-text');

function stringifyOutlookTaskBody(body) {
    switch (body.ContentType.toLowerCase()) {
    case 'text':
        return body.Content;
    case 'html':
        return htmlToText.fromString(body.Content);
    default:
        return '';
    }
}

function mapOutlookTask(task) {
    const dueDate = task.DueDateTime;
    return {
        text: task.Subject,
        type: 'todo',
        date: dueDate ? moment(dueDate.DateTime).toDate() : null,
        notes: stringifyOutlookTaskBody(task.Body),
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
        return this.outlook.getTask(id).then((task) => {
            if (task.CompletedDateTime !== null) {
                return Promise.resolve();
            }
            return this.dynamo.get(id).then((item) => {
                const habiticaTask = mapOutlookTask(task);
                return this.habitica.updateTask(item.habiticaId, habiticaTask).then(() => (
                    console.log(`Updated Habitica task ${item.habiticaId}`)
                ));
            });
        });
    }

    handleOutlookTaskDelete(id) {
        console.log(`Outlook task ${id} was deleted`);
        return this.dynamo.get(id).then((item) => {
            console.log(`Deleted Habitica task ${item.habiticaId}`);
            return this.habitica.deleteTask(item.habiticaId);
        }).then(() => this.dynamo.delete(id));
    }

    handleOutlookNotification(notification) {
        console.log(notification);
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

    handleHabiticaTaskScored(task) {
        if (task.type !== 'todo' || !task.completed) {
            return Promise.resolve();
        }
        console.log(`Habitica task ${task.id} has been completed`);
        return this.dynamo.scan('habiticaId', task.id).then(item => (
            this.outlook.completeTask(item.id)
        )).then(outlookTask => console.log(`Completed Outlook task ${outlookTask.Id}`));
    }

    handleHabiticaNotification(notification) {
        switch (notification.type) {
        case 'scored':
            return this.handleHabiticaTaskScored(notification.task);
        default:
            return Promise.resolve();
        }
    }
}
module.exports = TaskEngine;
