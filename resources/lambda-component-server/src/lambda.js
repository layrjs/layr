import {join, resolve, relative} from 'path';
import {existsSync, writeFileSync, statSync, utimesSync} from 'fs';
import {isEqual} from 'lodash';
import {formatString, formatPath, formatCode, task} from '@resdir/console';
import {Lambda} from '@resdir/aws-client';
import sleep from 'sleep-promise';
import {zip} from '@resdir/archive-manager';
import {createClientError} from '@resdir/error';
import {copy, remove} from 'fs-extra';
import isDirectory from 'is-directory';
import readDirectory from 'recursive-readdir';
import tempy from 'tempy';
import hasha from 'hasha';

const AWS_LAMBDA_NODE_RUNTIME = 'nodejs12.x';

export default () => ({
  async createOrUpdateLambdaFunction({iamLambdaRoleHasJustBeenCreated}, environment) {
    await task(
      async progress => {
        const lambdaFunction = await this.getLambdaFunction({throwIfNotFound: false});
        if (!lambdaFunction) {
          progress.setMessage('Creating Lambda function...');
          progress.setOutro('Lambda function created');
          await this.createLambdaFunction({iamLambdaRoleHasJustBeenCreated}, environment);
          await this.setLambdaFunctionTags();
        } else {
          await this.checkLambdaFunctionTags();
          if (await this.checkIfLambdaFunctionConfigurationHasChanged()) {
            progress.setMessage('Updating Lambda function configuration...');
            progress.setOutro('Lambda function updated');
            await this.updateLambdaFunctionConfiguration();
          }
          if (await this.checkIfLambdaFunctionConcurrencyHasChanged()) {
            progress.setMessage('Updating Lambda function concurrency...');
            progress.setOutro('Lambda function updated');
            await this.updateLambdaFunctionConcurrency();
          }
          if (await this.checkIfLambdaFunctionCodeHasChanged(environment)) {
            progress.setMessage('Updating Lambda function code...');
            progress.setOutro('Lambda function updated');
            await this.updateLambdaFunctionCode(environment);
          }
        }
      },
      {
        intro: `Checking Lambda function...`,
        outro: `Lambda function checked`
      },
      environment
    );
  },

  async getLambdaFunction({throwIfNotFound = true} = {}) {
    if (!this._lambdaFunction) {
      const lambda = this.getLambdaClient();
      try {
        const result = await lambda.getFunction({
          FunctionName: this.getLambdaFunctionName()
        });
        const config = result.Configuration;
        this._lambdaFunction = {
          arn: config.FunctionArn,
          runtime: config.Runtime,
          memorySize: config.MemorySize,
          timeout: config.Timeout,
          reservedConcurrentExecutions:
            result.Concurrency && result.Concurrency.ReservedConcurrentExecutions,
          environment: (config.Environment && config.Environment.Variables) || {},
          codeSHA256: config.CodeSha256,
          tags: result.Tags
        };
      } catch (err) {
        if (err.code !== 'ResourceNotFoundException') {
          throw err;
        }
      }
    }

    if (!this._lambdaFunction && throwIfNotFound) {
      throw createClientError('Lambda function not found');
    }

    return this._lambdaFunction;
  },

  async createLambdaFunction({iamLambdaRoleHasJustBeenCreated}, environment) {
    const lambda = this.getLambdaClient();
    const role = await this.getIAMLambdaRole();
    const zipArchive = await this.getZipArchive(environment);

    let errors = 0;
    while (!this._lambdaFunction) {
      try {
        const lambdaFunction = await lambda.createFunction({
          FunctionName: this.getLambdaFunctionName(),
          Handler: 'handler.handler',
          Runtime: AWS_LAMBDA_NODE_RUNTIME,
          Role: role.arn,
          MemorySize: this.memorySize,
          Timeout: this.timeout,
          Environment: {Variables: this.environment || {}},
          Code: {ZipFile: zipArchive}
        });
        this._lambdaFunction = {arn: lambdaFunction.FunctionArn};
      } catch (err) {
        errors++;
        const roleMayNotBeReady =
          err.code === 'InvalidParameterValueException' &&
          iamLambdaRoleHasJustBeenCreated &&
          errors <= 10;
        if (!roleMayNotBeReady) {
          throw err;
        }
        await sleep(3000);
      }
    }

    if (this.reservedConcurrentExecutions !== undefined) {
      await this.updateLambdaFunctionConcurrency();
    }
  },

  async checkLambdaFunctionTags() {
    const lambdaFunction = await this.getLambdaFunction();
    if (!isEqual(lambdaFunction.tags, {'managed-by': this.MANAGER_IDENTIFIER})) {
      throw createClientError(
        `Can't update a Lambda function not originally created by ${formatString(
          this.RESOURCE_ID
        )} (functionName: ${formatString(this.getLambdaFunctionName())})`
      );
    }
  },

  async setLambdaFunctionTags() {
    const lambda = this.getLambdaClient();
    const lambdaFunction = await this.getLambdaFunction();
    await lambda.tagResource({
      Resource: lambdaFunction.arn,
      Tags: {'managed-by': this.MANAGER_IDENTIFIER}
    });
  },

  async checkIfLambdaFunctionConfigurationHasChanged() {
    const lambdaFunction = await this.getLambdaFunction();

    if (lambdaFunction.runtime !== AWS_LAMBDA_NODE_RUNTIME) {
      return true;
    }

    if (lambdaFunction.memorySize !== this.memorySize) {
      return true;
    }

    if (lambdaFunction.timeout !== this.timeout) {
      return true;
    }

    if (lambdaFunction.reservedConcurrentExecutions !== this.reservedConcurrentExecutions) {
      return true;
    }

    if (!isEqual(lambdaFunction.environment, this.environment || {})) {
      return true;
    }

    return false;
  },

  async updateLambdaFunctionConfiguration() {
    const lambda = this.getLambdaClient();
    await lambda.updateFunctionConfiguration({
      FunctionName: this.getLambdaFunctionName(),
      Runtime: AWS_LAMBDA_NODE_RUNTIME,
      MemorySize: this.memorySize,
      Timeout: this.timeout,
      Environment: {Variables: this.environment || {}}
    });
  },

  async checkIfLambdaFunctionConcurrencyHasChanged() {
    const lambdaFunction = await this.getLambdaFunction();
    return lambdaFunction.reservedConcurrentExecutions !== this.reservedConcurrentExecutions;
  },

  async updateLambdaFunctionConcurrency() {
    const lambda = this.getLambdaClient();
    if (this.reservedConcurrentExecutions === undefined) {
      await lambda.deleteFunctionConcurrency({FunctionName: this.getLambdaFunctionName()});
    } else {
      await lambda.putFunctionConcurrency({
        FunctionName: this.getLambdaFunctionName(),
        ReservedConcurrentExecutions: this.reservedConcurrentExecutions
      });
    }
  },

  async checkIfLambdaFunctionCodeHasChanged(environment) {
    const lambdaFunction = await this.getLambdaFunction();
    const zipArchive = await this.getZipArchive(environment);
    const zipArchiveSHA256 = hasha(zipArchive, {encoding: 'base64', algorithm: 'sha256'});
    return lambdaFunction.codeSHA256 !== zipArchiveSHA256;
  },

  async updateLambdaFunctionCode(environment) {
    const lambda = this.getLambdaClient();
    await lambda.updateFunctionCode({
      FunctionName: this.getLambdaFunctionName(),
      ZipFile: await this.getZipArchive(environment)
    });
  },

  async getZipArchive(environment) {
    if (!this._zipArchive) {
      await task(
        async () => {
          const directory = this.$getCurrentDirectory();

          const tempDirectory = tempy.directory();

          const allFiles = [];

          await copy(
            join(__dirname, '..', '..', 'lambda-handler', 'dist', 'bundle.js'),
            join(tempDirectory, 'handler.js')
          );
          allFiles.push('handler.js');

          const mainFile = resolve(directory, this.main);
          const relativeMainFile = relative(directory, mainFile);

          const componentServerFile = join(tempDirectory, 'component-server.js');
          const componentServerCode = `module.exports = require('./${relativeMainFile}');\n`;
          writeFileSync(componentServerFile, componentServerCode);
          const {atime, mtime} = statSync(mainFile);
          utimesSync(componentServerFile, atime, mtime);
          allFiles.push('component-server.js');

          const files = await this._getFiles();

          if (!files.includes(mainFile)) {
            files.push(mainFile);
          }

          for (const file of files) {
            const relativeFile = relative(directory, file);
            await copy(file, join(tempDirectory, relativeFile));
            allFiles.push(relativeFile);
          }

          this._zipArchive = await zip(tempDirectory, allFiles);

          await remove(tempDirectory);
        },
        {
          intro: `Building ZIP archive...`,
          outro: `ZIP archive built`
        },
        environment
      );
    }

    return this._zipArchive;
  },

  async _getFiles() {
    const directory = this.$getCurrentDirectory();

    const files = [];

    const filesProperty = this.files || [];
    for (const file of filesProperty) {
      const resolvedFile = resolve(directory, file);

      if (!existsSync(resolvedFile)) {
        throw createClientError(
          `File ${formatPath(file)} specified in ${formatCode('files')} property doesn't exist`
        );
      }

      if (isDirectory.sync(resolvedFile)) {
        const newFiles = await readDirectory(resolvedFile);
        newFiles.sort(); // Make readDirectory() more deterministic
        files.push(...newFiles);
      } else {
        files.push(resolvedFile);
      }
    }

    return files;
  },

  async allowLambdaFunctionInvocationFromAPIGateway() {
    const lambda = this.getLambdaClient();
    const lambdaFunction = await this.getLambdaFunction();
    const apiGateway = await this.getAPIGateway();

    const matches = /arn:aws:.+:.+:(\d+):/.exec(lambdaFunction.arn);
    const accountId = matches && matches[1];
    if (!accountId) {
      throw new Error('Unable to find out the AWS account ID');
    }
    const region = this.getAPIGatewayRegion();
    const sourceARN = `arn:aws:execute-api:${region}:${accountId}:${apiGateway.id}/*/*`;

    await lambda.addPermission({
      FunctionName: lambdaFunction.arn,
      Action: 'lambda:InvokeFunction',
      Principal: 'apigateway.amazonaws.com',
      StatementId: 'allow_api_gateway',
      SourceArn: sourceARN
    });
  },

  getLambdaFunctionName() {
    return this.domainName.replace(/\./g, '-');
  },

  getLambdaClient() {
    if (!this._lambdaClient) {
      this._lambdaClient = new Lambda(this.aws);
    }
    return this._lambdaClient;
  }
});
