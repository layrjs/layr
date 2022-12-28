export default () => ({
  type: 'application',

  services: {
    frontend: './frontend',
    backend: './backend',
    database: './database'
  },

  environment: {
    APPLICATION_NAME: 'Layr',
    APPLICATION_DESCRIPTION: 'Dramatically simplify full‑stack development.'
  },

  stages: {
    production: {
      environment: {
        NODE_ENV: 'production'
      }
    }
  }
});
