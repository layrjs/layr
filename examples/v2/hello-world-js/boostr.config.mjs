export default () => ({
  type: 'application',

  services: {
    frontend: './frontend',
    backend: './backend',
    database: './database'
  },

  environment: {
    APPLICATION_NAME: 'Layr App',
    APPLICATION_DESCRIPTION: 'A Layr app managed by Boostr'
  },

  stages: {
    staging: {
      environment: {
        NODE_ENV: 'production'
      }
    },
    production: {
      environment: {
        NODE_ENV: 'production'
      }
    }
  }
});
