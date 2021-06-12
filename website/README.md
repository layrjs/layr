# Layr Website

This directory contains the source code of the [Layr](https://layrjs.com) website.

## About

The Layr website is a single-page application created with [Layr](https://github.com/layrjs/layr). The frontend is statically hosted in AWS S3 + CloudFront and the backend is serverlessly hosted in AWS Lambda + API Gateway. Regarding the database, it is a free-tier MongoDB Atlas cluster with a daily backup that is handled by a Lambda function.

## Prerequisites

- Make sure your have a [Node.js](https://nodejs.org/) (v14 or newer) installed.
- Make sure you have [Boostr](https://boostr.dev/) installed as it is used to manage the development environment.

## Installation

Install all the npm dependencies with the following command:

```sh
boostr install
```

## Development

### Configuration

- Generate a JWT secret by running the following command in your terminal:
  - `openssl rand -hex 64`
- In the `backend` directory, duplicate the `boostr.config.private-template.mjs` file, name it `boostr.config.private.mjs`, and modify it to set all the required private development environment variables.

### Migrating the database

Migrate the database with the following command:

```sh
boostr database migrate
```

### Starting the development environment

Start the development environment with the following command:

```
boostr start
```

The website should be available at http://localhost:18887.

## Production

### Configuration

- Configure a [MailerLite](https://www.mailerlite.com/) domain and visit https://app.mailerlite.com/integrations/api/ to get your API key and your subscriber group ID.
- Generate a JWT secret by running the following command in your terminal:
  - `openssl rand -hex 64`
- In the `backend` directory, duplicate the `boostr.config.private-template.mjs` file, name it `boostr.config.private.mjs`, and modify it to set all the required private production environment variables.
- In the `database` directory, duplicate the `boostr.config.private-template.mjs` file, name it `boostr.config.private.mjs`, and modify it to set the `stages.production.url` attribute to the URL of your production MongoDB database.

### Migrating the database

Migrate the database with the following command:

```sh
boostr database migrate --production
```

### Deployment

Deploy the website to production with the following command:

```
boostr deploy --production
```

The website should be available at https://layrjs.com.
