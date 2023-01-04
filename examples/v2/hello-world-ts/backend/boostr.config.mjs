export default ({services}) => ({
  type: 'backend',

  dependsOn: 'database',

  environment: {
    FRONTEND_URL: services.frontend.url,
    BACKEND_URL: services.backend.url,
    DATABASE_URL: services.database.url
  },

  rootComponent: './src/index.ts',

  stages: {
    development: {
      url: 'http://localhost:14952/',
      platform: 'local'
    },
    staging: {
      url: 'https://staging.backend.example.com/',
      platform: 'aws',
      aws: {
        region: 'us-east-1',
        lambda: {
          memorySize: 1024
        }
      }
    },
    production: {
      url: 'https://backend.example.com/',
      platform: 'aws',
      aws: {
        region: 'us-east-1',
        lambda: {
          memorySize: 1024
        }
      }
    }
  }
});
