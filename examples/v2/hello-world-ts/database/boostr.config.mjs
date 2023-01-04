export default () => ({
  type: 'database',

  stages: {
    development: {
      url: 'mongodb://localhost:14953/dev',
      platform: 'local'
    }
  }
});
