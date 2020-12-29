# Layr Website

## Install

Install the npm dependencies with:

```sh
npm install
```

Make sure you have [Docker](https://www.docker.com/) installed as it is used to run the database (MongoDB) when running the app in development mode.

## Usage

### Running the app in development mode

Execute the following command:

```sh
FRONTEND_URL=http://localhost:18887 \
  BACKEND_URL=http://localhost:18888 \
  MONGODB_STORE_CONNECTION_STRING=mongodb://test:test@localhost:18889/test \
  JWT_SECRET=67d86ffae3c048121dd357fa668b576c8f08b4faf08a57405ded5deae9a7e8f1dec98d35f3bbf4284dbab00fe3341dbc45890baa4a7c5dcc83499ffafb8bd6bb \
  npm run start
```

The app should then be available at http://localhost:18887.

### Migrating the database

Navigate to the `./backend` directory and execute the following command while replacing the `"********"` placeholders with the values corresponding to the environment you want to migrate.

```sh
FRONTEND_URL="********" \
  BACKEND_URL="********" \
  MONGODB_STORE_CONNECTION_STRING="********" \
  JWT_SECRET="********" \
  npm run migrate
```

### Debugging

#### Client

Add the following entry in the local storage of your browser:

```
| Key   | Value     |
| ----- | --------- |
| debug | layr:* |
```

#### Server

Add the following environment variables when starting the app:

```sh
DEBUG=layr:* DEBUG_DEPTH=10
```
