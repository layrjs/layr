export default ({services}) => ({
  type: 'web-frontend',

  dependsOn: 'backend',

  environment: {
    FRONTEND_URL: services.frontend.url,
    BACKEND_URL: services.backend.url
  },

  rootComponent: './src/index.js',

  html: {
    language: 'en',
    head: {
      title: services.frontend.environment.APPLICATION_NAME,
      metas: [
        {name: 'description', content: services.frontend.environment.APPLICATION_DESCRIPTION},
        {charset: 'utf-8'},
        {name: 'viewport', content: 'width=device-width, initial-scale=1'},
        {'http-equiv': 'x-ua-compatible', 'content': 'ie=edge'}
      ],
      links: [{rel: 'icon', href: '/boostr-favicon-3NjLR7w1Mu8UAIqq05vVG3.immutable.png'}]
    }
  },

  stages: {
    development: {
      url: 'http://localhost:16189/',
      platform: 'local'
    },
    staging: {
      url: 'https://staging.example.com/',
      platform: 'aws',
      aws: {
        region: 'us-east-1',
        cloudFront: {
          priceClass: 'PriceClass_100'
        }
      }
    },
    production: {
      url: 'https://example.com/',
      platform: 'aws',
      aws: {
        region: 'us-east-1',
        cloudFront: {
          priceClass: 'PriceClass_100'
        }
      }
    }
  }
});
