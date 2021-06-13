const {buildDocumentation, freezeDocumentation} = require('@mvila/simple-doc');
const {copySync, removeSync, readJsonSync, writeJSONSync} = require('fs-extra');
const path = require('path');

const VERSION = 'v2';

const SOURCE_DIRECTORY = './contents';
const BUILD_DIRECTORY = './build';
const WEBSITE_DIRECTORY = '../website/frontend/public/docs';
const WEBSITE_INDEX_FILE = '../website/frontend/src/docs.json';

const sourceDirectory = path.resolve(__dirname, SOURCE_DIRECTORY);
const buildDirectory = path.resolve(__dirname, BUILD_DIRECTORY);
const websiteDirectory = path.resolve(__dirname, WEBSITE_DIRECTORY);
const websiteIndexFile = path.resolve(__dirname, WEBSITE_INDEX_FILE);

buildDocumentation(sourceDirectory, buildDirectory);

freezeDocumentation(buildDirectory);

console.log(`Writing index file to '${path.relative(process.cwd(), websiteIndexFile)}'...`);

const builtIndexFile = path.join(buildDirectory, 'index.json');

const builtIndex = readJsonSync(builtIndexFile);
const websiteIndex = readJsonSync(websiteIndexFile);

websiteIndex.versions[VERSION] = builtIndex;

writeJSONSync(websiteIndexFile, websiteIndex, {spaces: 2});

const websiteDirectoryWithVersion = path.join(websiteDirectory, VERSION);

console.log(
  `Copying contents to '${path.relative(process.cwd(), websiteDirectoryWithVersion)}'...`
);

removeSync(websiteDirectoryWithVersion);

copySync(buildDirectory, websiteDirectoryWithVersion, {
  filter(source) {
    return source !== builtIndexFile;
  }
});
