export default () => ({
  stages: {
    development: {
      environment: {
        JWT_SECRET: '********'
      }
    },
    production: {
      environment: {
        MAILER_LITE_API_KEY: '********',
        MAILER_LITE_NEWSLETTER_SUBSCRIPTIONS_GROUP_ID: '********',
        JWT_SECRET: '********'
      }
    }
  }
});
