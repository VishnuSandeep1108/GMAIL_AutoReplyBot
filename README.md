# Gmail Automation with Node.js

This project demonstrates automation of Gmail reply functionality using Node.js and the Gmail API from Google Cloud.

## Overview

The code consists of several functions for handling Gmail operations such as:

- Loading and saving user credentials.
- Creating a 'Vacation' label in Gmail.
- Processing unread messages and sending replies.

## Libraries and Technologies Used

- **NodeJS**: The code is written in JavaScript and runs on the Node.js runtime environment.
- **File System Module (fs)**: Utilized for file operations such as reading and writing files asynchronously.
- **Path Module (path)**: Employed for handling and constructing file paths in a platform-independent manner.
- **Process Module (process)**: Utilized to access information about the current process and file system.
- **Google APIs and Google Cloud Libraries**:
    - **googleapis**: Provides an interface to various Google APIs, in this case, the Gmail API.
    - **@google-cloud/local-auth**: Facilitates authentication with Google services.

## Usage

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Ensure you have the required `credentials.json` and `token.json` files.
4. Run the code using `node app.js`.

## Contributing

Feel free to contribute by opening issues or pull requests.
