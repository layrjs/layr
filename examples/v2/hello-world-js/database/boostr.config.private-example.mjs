/**
 * This is an example of a private Boostr configuration file allowing you to
 * override the `boostr.config.mjs` public configuration.
 *
 * Duplicate this file and name it `boostr.config.private.mjs` to activate it
 * in your local development environment.
 */

export default () => ({
  stages: {
    staging: {
      url: 'mongodb+srv://user:pass@clusterNane.mongodb.net/exampleStaging?retryWrites=true&w=majority'
    },
    production: {
      url: 'mongodb+srv://user:pass@clusterNane.mongodb.net/exampleProduction?retryWrites=true&w=majority'
    }
  }
});
