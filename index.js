const Promise = require('bluebird');
const ld = require('lodash');
const aws = require('aws-sdk');
const request = Promise.promisify(require('request'));
const config = require('./config.json');
const moment = require('moment');
const querystring = require('querystring');

const client = new aws.DynamoDB.DocumentClient({ region: 'us-east-1' });
const batchGet = Promise.promisify(client.batchGet, { context: client });
const batchWrite = Promise.promisify(client.batchWrite, { context: client });
const tokenInfo = { };
const s3 = new aws.S3({ region: 'us-east-1' });
const putObject = Promise.promisify(s3.putObject, { context: s3 });
const getObject = Promise.promisify(s3.getObject, { context: s3 });

// Loads the token info from S3
function getTokenInfo() {
    return getObject({
        Bucket: config.s3.bucket,
        Key: 'token.json',
    }).then(({ Body }) => ld.assign(tokenInfo, JSON.parse(Body)));
}

// Attempts to refresh the access token if it is about to expire
function refreshToken() {
    return moment().add(15, 'minutes').isBefore(tokenInfo.expires) ?
        Promise.resolve() :
        request({
            method: 'post',
            uri: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: querystring.stringify({
                client_id: config.outlook.clientId,
                client_secret: config.outlook.clientSecret,
                refresh_token: tokenInfo.refreshToken,
                redirect_uri: 'http://localhost:3000',
                grant_type: 'refresh_token',
            }),
            json: true,
        }).then(({ body }) => {
            ld.assign(tokenInfo, {
                token: body.access_token,
                refreshToken: body.refresh_token,
                expires: moment().add(body.expires_in, 'seconds').toDate(),
            });
            return putObject({
                Bucket: config.s3.bucket,
                Key: 'token.json',
                Body: JSON.stringify(tokenInfo),
            });
        });
}

// Template for sending a request to Outlook
function outlookRequest(endpoint, options = { }) {
    const requestOptions = ld.assign({
        uri: `https://outlook.office.com/api/v2.0${endpoint}`,
        headers: {
            Authorization: `Bearer ${tokenInfo.token}`,
        },
    }, options);
    return request(requestOptions).then(({ statusCode, body }) => {
        if (Math.floor(statusCode / 100) !== 2) {
            throw new Error(`code ${statusCode}`);
        }
        return body;
    });
}

// Template for sending a request to Habitica
function habiticaRequest(endpoint, options = { }) {
    const requestOptions = ld.assign({
        uri: `https://habitica.com/api/v3${endpoint}`,
        headers: {
            'x-api-user': config.habitica.user,
            'x-api-key': config.habitica.token,
        },
    }, options);
    return request(requestOptions).then(({ statusCode, body }) => {
        if (Math.floor(statusCode / 100) !== 2) {
            throw new Error(`code ${statusCode}`);
        }
        return body;
    });
}

// Gets an array of uncompleted tasks from Outlook
function getTasks() {
    return outlookRequest('/me/tasks/$count', {
        $filter: 'CompletedDateTime eq null',
    }).then((body) => {
        const count = Number(body);
        const array = new Array(Math.ceil(count / 10)).fill(null);
        return Promise.map(array, (item, index) => (
            outlookRequest('/me/tasks', {
                json: true,
                qs: {
                    $filter: 'CompletedDateTime eq null',
                    $orderby: 'CreatedDateTime asc',
                    $top: 10,
                    $skip: index * 10,
                },
            })
        ), { concurrency: 2 });
    }).map(({ value }) => value).reduce((accumulator, item) => accumulator.concat(item), []);
}

// Gets the sync records given an array of Outlook task ids
function getDynamoRecords(ids) {
    return (ids.length === 0) ? [] : batchGet({
        RequestItems: {
            'outlook-habitica': {
                Keys: ids.map(id => ({ id })),
            },
        },
    }).then(({ Responses }) => Responses['outlook-habitica']);
}

// Updated the sync records given an array of Outlook tasks and correspondign Habitica tasks
function updateDynamoRecords(tasks, habiticaTasks) {
    return batchWrite({
        RequestItems: {
            'outlook-habitica': habiticaTasks.map((habiticaTask, index) => ({
                PutRequest: {
                    Item: {
                        id: tasks[index].Id,
                        habiticaId: habiticaTask.id,
                        updated: habiticaTask.updatedAt,
                    },
                },
            })),
        },
    });
}

// Maps an Outlook task to update fields for a Habitica task
function mapToHabiticaTask(task) {
    return {
        text: task.Subject,
        type: 'todo',
    };
}

// Syncs new Outlook tasks to Habitica
function syncNewTasks(tasks) {
    return (tasks.length === 0) ?
        Promise.resolve([]) :
        habiticaRequest('/tasks/user', {
            method: 'post',
            body: tasks.map(task => mapToHabiticaTask(task)),
            json: true,
        }).then(({ data }) => {
            const habiticaTasks = [].concat(data);
            return updateDynamoRecords(tasks, habiticaTasks).then(() => habiticaTasks);
        });
}

// Syncs updated Outlook tasks to Habitica
function syncUpdatedTasks(tasks, records) {
    return (tasks.length === 0) ?
        Promise.resolve([]) :
        Promise.map(records, (record, index) => (
            habiticaRequest(`/tasks/${record.habiticaId}`, {
                method: 'put',
                body: mapToHabiticaTask(tasks[index]),
                json: true,
            })
        ), { concurrency: 2 }).map(({ data }) => data).then(habiticaTasks => (
            updateDynamoRecords(tasks, habiticaTasks).then(() => habiticaTasks)
        ));
}

// Get tasks from Outlook
getTokenInfo().then(() => refreshToken()).then(() => getTasks()).then((tasks) => {
    // Find tasks that are new or need to be updated in Habitica
    const outlookIds = tasks.map(({ Id }) => Id);
    return getDynamoRecords(outlookIds).then((results) => {
        const newTasks = [];
        const updatedTasks = [];
        const records = [];
        tasks.forEach((task) => {
            const record = results.find(result => (result.id === task.Id));
            if (!record) {
                newTasks.push(task);
            } else if (moment(record.updated).isBefore(task.LastModifiedDateTime)) {
                updatedTasks.push(task);
                records.push(record);
            }
        });

        // Sync tasks to Habitica
        return Promise.all([
            syncNewTasks(newTasks),
            syncUpdatedTasks(updatedTasks, records),
        ]);
    });
})
.then((results) => {
    const newTasks = results[0];
    const updatedTasks = results[1];
    console.log(`${newTasks.length} tasks added:`);
    newTasks.forEach(task => console.log(`- ${task.text}`));
    console.log(`${updatedTasks.length} tasks updated:`);
    updatedTasks.forEach(task => console.log(`- ${task.text}`));
});
