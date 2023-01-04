export default () => ({
  type: 'database',

  stages: {
    development: {
      url: 'mongodb://localhost:16191/dev',
      platform: 'local'
    }
  }
});
