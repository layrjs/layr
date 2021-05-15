export default () => ({
  type: 'application',

  name: 'Layr',
  description: 'Dramatically simplify full‑stack development',

  services: {
    frontend: './frontend',
    backend: './backend',
    database: './database'
  }
});
