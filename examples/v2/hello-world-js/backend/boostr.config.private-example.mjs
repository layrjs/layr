/**
 * This is an example of a private Boostr configuration file allowing you to
 * override the `boostr.config.mjs` public configuration.
 *
 * Duplicate this file and name it `boostr.config.private.mjs` to activate it
 * in your local development environment.
 */

export default () => ({
  stages: {
    development: {
      environment: {
        JWT_SECRET: '********'
      }
    },
    staging: {
      environment: {
        JWT_SECRET: '********'
      }
    },
    production: {
      environment: {
        JWT_SECRET: '********'
      }
    }
  }
});
