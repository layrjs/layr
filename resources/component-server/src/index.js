import {formatCode} from '@resdir/console';
import {createClientError} from '@resdir/error';
import {join} from 'path';
import {ensureDir, pathExists, rename} from 'fs-extra';

export default () => ({
  async aroundDeploy(fn, environment) {
    try {
      if (this.reinstallDependenciesWhileDeploying) {
        await this._startReinstallDependencies(environment);
      }
      await fn();
    } finally {
      if (this.reinstallDependenciesWhileDeploying) {
        await this._completeReinstallDependencies(environment);
      }
    }
  },

  async _startReinstallDependencies(environment) {
    const directory = this.$getCurrentDirectory();

    const dependencies = this.$getRoot().$getChild('dependencies');
    if (!dependencies) {
      return;
    }

    await ensureDir(join(directory, 'node_modules'));

    await rename(join(directory, 'node_modules'), join(directory, 'node_modules.original'));

    if (await pathExists(join(directory, 'node_modules.clean-install'))) {
      await rename(join(directory, 'node_modules.clean-install'), join(directory, 'node_modules'));
    }

    await dependencies.update({optimizeDiskSpace: false}, environment);
  },

  async _completeReinstallDependencies(_environment) {
    const directory = this.$getCurrentDirectory();

    if (!(await pathExists(join(directory, 'node_modules.original')))) {
      return;
    }

    if (await pathExists(join(directory, 'node_modules'))) {
      await rename(join(directory, 'node_modules'), join(directory, 'node_modules.clean-install'));
    }

    await rename(join(directory, 'node_modules.original'), join(directory, 'node_modules'));
  },

  validate() {
    if (!this.domainName) {
      throw createClientError(`${formatCode('domainName')} attribute is missing`);
    }
  }
});
