// Import required modules
const fsPromises = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

// Define scopes and file paths
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// Function to load saved credentials if they exist
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fsPromises.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

// Function to save credentials after authorization
async function saveCredentials(client) {
  const content = await fsPromises.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const keyDetails = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: keyDetails.client_id,
    client_secret: keyDetails.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fsPromises.writeFile(TOKEN_PATH, payload);
}

// Function to authorize user with Google APIs
async function authorize() {
  let authClient = await loadSavedCredentialsIfExist();
  if (!authClient) {
    authClient = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (authClient.credentials) {
      await saveCredentials(authClient);
    }
  }
  return authClient;
}

// Variable to store vacation label ID
let vacationLabelId;

// Function to create a 'Vacation' label in Gmail
async function createLabel(authClient) {
  const gmail = google.gmail({ version: 'v1', auth: authClient });
  let labels = await gmail.users.labels.list({ userId: 'me' });
  labels = labels.data.labels;

  let labelCount = 0;

  labels.find((label) => {
    if (label.name === 'Vacation') {
      labelCount++;
    }
  });

  if (labelCount === 0) {
    const createdLabel = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: 'Vacation',
        messageListVisibility: 'show',
        labelListVisibility: 'labelShow',
        type: 'user',
      },
    });
    vacationLabelId = createdLabel.data.id;
  } else {
    labels.find((label) => {
      if (label.name === 'Vacation') {
        vacationLabelId = label.id;
      }
    });
  }
}

// Function to create a reply message
function createReply(from, to, subject, message, messageId, threadId) {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: Re: ${subject}`,
    `Thread-ID: ${threadId}`,
    `In-Reply-To: ${threadId}`,
    `References: ${messageId}, ${threadId}`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    message,
  ];

  const rawEmail = headers.join('\r\n');
  const encodedEmail = Buffer.from(rawEmail).toString('base64');

  return encodedEmail;
}

// Function to process unread messages and send vacation replies
async function processUnreadMessages(authClient) {
  const gmail = google.gmail({ version: 'v1', auth: authClient });
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: "is:unread label:inbox -label:VACATION -label:CATEGORY_FORUMS -label:CATEGORY_UPDATES -label:CATEGORY_PROMOTIONS -label:CATEGORY_SOCIAL"
  });
  const unreadMessages = response.data.messages;

  if (unreadMessages) {
    for (const message of unreadMessages) {
      try {
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });

        // Extract necessary information from email headers
        const headers = messageResponse.data.payload.headers;
        let to, from, subject, replyMessage, messageId, threadId;

        // Extract relevant header information
        to = headers.find(object => object.name === 'From').value;
        from = headers.find(object => object.name === 'To').value;
        subject = headers.find(object => object.name === 'Subject').value;
        messageId = headers.find(object => object.name === 'Message-ID').value;
        threadId = message.threadId;
        replyMessage = "Thank You for Your Message. I'm on a Vacation and will reach out to you soon.";

        // Get thread details
        const threadDetails = await gmail.users.threads.get({
          userId: 'me',
          id: threadId
        });

        // Get labels for the thread
        const threadLabels = threadDetails.data.messages[0].labelIds;

        // Check if the message thread already has the 'Vacation' label
        if (!threadLabels.includes(vacationLabelId)) {
          // Send a reply message
          await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: createReply(from, to, subject, replyMessage, messageId, threadId),
              threadId: threadId
            }
          });

          // Add 'Vacation' label to the message thread
          await gmail.users.threads.modify({
            userId: 'me',
            id: message.id,
            requestBody: {
              "addLabelIds": [
                vacationLabelId
              ]
            }
          });
        }
      } catch (error) {
        console.log("There is an error ", error);
      }
    }

    // Set a random interval for the next check
    const randomInterval = Math.floor(Math.random() * (120 - 45 + 1)) + 45;
    console.log("Next Check in ", randomInterval, "Seconds");
    setTimeout(() => {
      authorize().then(processUnreadMessages).catch(console.error);
    }, randomInterval * 1000);
  } else {
    // If there are no unread messages, set a random interval for the next check
    const randomInterval = Math.floor(Math.random() * (120 - 45 + 1)) + 45;
    console.log("Next Check in ", randomInterval, "Seconds");
    setTimeout(() => {
      authorize().then(processUnreadMessages).catch(console.error);
    }, randomInterval * 1000);
  }
}

// Function to initiate label creation and unread message processing
async function initiateProcess() {
  await authorize().then(createLabel).catch(console.error);
  await authorize().then(processUnreadMessages).catch(console.error);
}

// Start the process
initiateProcess();


/* Libraries and Technologies Used:
- NodeJS: The code is written in JavaScript and runs on the Node.js runtime environment.
- File System Module (fs): Utilized for file operations such as reading and writing files asynchronously.
- Path Module (path): Employed for handling and constructing file paths in a platform-independent manner.
- Process Module (process): Utilized to access information about the current process and file system.
- Google APIs and Google Cloud Libraries:
    googleapis: Provides an interface to various Google APIs, in this case, the Gmail API.
    @google-cloud/local-auth: Facilitates authentication with Google services.
*/

/* Areas of Improvement: 
- Optimization: Efficiency can be improved  by implementing optimizations such as caching, reducing unnecessary API calls, and optimizing looping logic.
- Modularization: Breaking down the functionality into smaller, reusable functions or modules to enhance code maintainability and readability.
- Enhance Readability: Users can focus on the most relevant parts of the message while being able to expand sections for additional context if needed.
*/