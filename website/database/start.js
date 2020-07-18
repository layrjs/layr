const {execFileSync} = require('child_process');

const connectionString = process.env.MONGODB_STORE_CONNECTION_STRING;

if (!connectionString) {
  throw new Error(`'MONGODB_STORE_CONNECTION_STRING' environment variable is missing`);
}

const port = Number(new URL(connectionString).port || '27017');

process.on('SIGINT', () => {});

execFileSync(
  'docker',
  [
    'run',
    '--name',
    'liaison-website-database',
    '--rm',
    '--volume',
    `${__dirname}/data:/data/db`,
    '--volume',
    `${__dirname}/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro`,
    '--publish',
    `127.0.0.1:${port}:27017`,
    '--env',
    'MONGO_INITDB_ROOT_USERNAME=test',
    '--env',
    'MONGO_INITDB_ROOT_PASSWORD=test',
    'mongo:4'
  ],
  {cwd: __dirname, stdio: 'inherit'}
);
