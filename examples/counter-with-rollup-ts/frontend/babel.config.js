module.exports = (api) => {
  api.cache(true);

  const presets = [
    ['@babel/preset-typescript'],
    [
      '@babel/preset-env',
      {
        targets: {chrome: '51', safari: '10', firefox: '54'},
        loose: true,
        modules: false
      }
    ],
    ['@babel/preset-react']
  ];

  const plugins = [
    ['@babel/plugin-proposal-decorators', {legacy: true}],
    ['@babel/plugin-proposal-class-properties', {loose: true}]
  ];

  return {presets, plugins};
};
