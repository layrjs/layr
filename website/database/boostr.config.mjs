export default () => ({
  type: 'database',

  stages: {
    development: {
      url: 'mongodb://localhost:18889/dev',
      platform: 'local'
    }
  }
});
