const Promise = require('bluebird');
const configUtils = require('./lib/configUtils');

// Template for sending a request to Outlook
function outlookRequest(endpoint, token, options) {
    const requestOptions = ld.assign({
        uri: `https://outlook.office.com/api/v2.0${endpoint}`,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    }, options || { });
    return request(requestOptions).then((response) => {
        if (response.statusCode !== 200) {
            throw new Error(`code ${response.statusCode}`);
        }
        return response.body;
    });
}

// Creates a task in Habitica
function createTask(config, id) {
    console.log(`Outlook task ${id} was created`);
    return Promise.resolve();
}

// Updates a task in Habitica
function updateTask(config, id) {
    console.log(`Outlook task ${id} was updated`);
    return Promise.resolve();
}

// Deletes a task in Habitica
function deleteTask(config, id) {
    console.log(`Outlook task ${id} was deleted`);
    return Promise.resolve();
}

// Handles a notification from Outlook
function handleUpdate(config, update) {
    const id = update.ResourceData.Id;
    switch (update.ChangeType) {
    case 'Created':
        return createTask(config, id);
    case 'Updated':
        return updateTask(config, id);
    case 'Deleted':
        return deleteTask(config, id);
    default:
        return Promise.resolve();
    }
}

exports.handler = (event, context, callback) => {
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
    const updates = event['body-json'].value;
    return configUtils.downloadConfig().then(config => (
        Promise.map(updates, update => handleUpdate(config, update))
    )).then(() => {
        console.log('hi');
        callback(null);
    });
};
