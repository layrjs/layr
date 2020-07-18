module.exports = () => {
  const frontendURL = process.env.FRONTEND_URL;

  if (!frontendURL) {
    throw new Error(`'FRONTEND_URL' environment variable is missing`);
  }

  const backendURL = process.env.BACKEND_URL;

  if (!backendURL) {
    throw new Error(`'BACKEND_URL' environment variable is missing`);
  }

  const domainName = new URL(backendURL).hostname;

  const connectionString = process.env.MONGODB_STORE_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error(`'MONGODB_STORE_CONNECTION_STRING' environment variable is missing`);
  }

  const mailerLiteAPIKey = process.env.MAILER_LITE_API_KEY;

  if (!mailerLiteAPIKey) {
    throw new Error(`'MAILER_LITE_API_KEY' environment variable is missing`);
  }

  const mailerLiteNewsletterSubscriptionsGroupId =
    process.env.MAILER_LITE_NEWSLETTER_SUBSCRIPTIONS_GROUP_ID;

  if (!mailerLiteNewsletterSubscriptionsGroupId) {
    throw new Error(
      `'MAILER_LITE_NEWSLETTER_SUBSCRIPTIONS_GROUP_ID' environment variable is missing`
    );
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(`'JWT_SECRET' environment variable is missing`);
  }

  return {
    type: 'function',
    provider: 'aws',
    domainName,
    files: ['./build'],
    main: './build/handler.js',
    includeDependencies: true,
    environment: {
      FRONTEND_URL: frontendURL,
      BACKEND_URL: backendURL,
      MONGODB_STORE_CONNECTION_STRING: connectionString,
      MAILER_LITE_API_KEY: mailerLiteAPIKey,
      MAILER_LITE_NEWSLETTER_SUBSCRIPTIONS_GROUP_ID: mailerLiteNewsletterSubscriptionsGroupId,
      JWT_SECRET: jwtSecret
    },
    aws: {
      region: 'us-west-2',
      lambda: {
        memorySize: 1024,
        timeout: 15
      }
    }
  };
};
