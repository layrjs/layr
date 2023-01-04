# hello-world-ts

## Prerequisites

- Make sure you have [Node.js](https://nodejs.org/) v16 or newer installed.
- Make sure you have [Boostr](https://boostr.dev/) v2 installed. Boostr is used to manage the development environment.
- If you want to deploy your app to AWS, make sure you have [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html) installed and some [AWS credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) adequately set up.

## Installation

Install all the npm dependencies with the following command:

```sh
boostr install
```

## Configuration

In the `backend` and `database` directories, duplicate the `boostr.config.private-example.mjs` files, name them `boostr.config.private.mjs`, and modify them to set all the required private environment variables.

## Development

### Migrating the database

Migrate the development database with the following command:

```sh
boostr database migrate
```

### Starting the development environment

Start the development environment with the following command:

```sh
boostr start
```

The web app should be available at http://localhost:14951.

## Staging

### Migrating the database

Migrate the staging database with the following command:

```sh
boostr database migrate --staging
```

### Deploying the app

Deploy the app to your staging environment with the following command:

```sh
boostr deploy --staging
```

The web app should be available at https://staging.example.com/.

## Production

### Migrating the database

Migrate the production database with the following command:

```sh
boostr database migrate --production
```

### Deploying the app

Deploy the app to production with the following command:

```sh
boostr deploy --production
```

The web app should be available at https://example.com/.
