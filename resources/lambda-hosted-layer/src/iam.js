import {task} from '@resdir/console';
import {IAM} from '@resdir/aws-client';
import sleep from 'sleep-promise';
import {createClientError} from '@resdir/error';

const DEFAULT_IAM_ROLE_NAME = 'liaison-hosted-layer-lambda-role-v1';
const DEFAULT_IAM_POLICY_NAME = 'basic-lambda-policy';

const DEFAULT_IAM_ASSUME_ROLE_POLICY_DOCUMENT = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: 'lambda.amazonaws.com'
      },
      Action: 'sts:AssumeRole'
    }
  ]
};

const DEFAULT_IAM_POLICY_DOCUMENT = {
  Version: '2012-10-17',
  Statement: [
    {
      Action: ['logs:*'],
      Effect: 'Allow',
      Resource: '*'
    }
  ]
};

export default () => ({
  async ensureIAMLambdaRole(environment) {
    return await task(
      async progress => {
        let hasBeenCreated;
        const role = await this.getIAMLambdaRole({throwIfNotFound: false});
        if (!role) {
          progress.setMessage('Creating IAM Lambda role...');
          progress.setOutro('IAM Lambda role created');
          await this.createIAMLambdaRole();
          hasBeenCreated = true;
        }
        return hasBeenCreated;
      },
      {
        intro: `Checking IAM Lambda role...`,
        outro: `IAM Lambda role checked`
      },
      environment
    );
  },

  async getIAMLambdaRole({throwIfNotFound = true} = {}) {
    if (!this._iamLambdaRole) {
      const iam = this.getIAMClient();
      try {
        const result = await iam.getRole({RoleName: this.getIAMRoleName()});
        this._iamLambdaRole = {arn: result.Role.Arn};
      } catch (err) {
        if (err.code !== 'NoSuchEntity') {
          throw err;
        }
      }
    }

    if (!this._iamLambdaRole && throwIfNotFound) {
      throw createClientError('IAM Lambda role not found');
    }

    return this._iamLambdaRole;
  },

  async createIAMLambdaRole() {
    const iam = this.getIAMClient();

    const assumeRolePolicyDocument = JSON.stringify(
      DEFAULT_IAM_ASSUME_ROLE_POLICY_DOCUMENT,
      undefined,
      2
    );
    const {
      Role: {Arn: arn}
    } = await iam.createRole({
      RoleName: this.getIAMRoleName(),
      AssumeRolePolicyDocument: assumeRolePolicyDocument
    });

    const policyDocument = JSON.stringify(DEFAULT_IAM_POLICY_DOCUMENT, undefined, 2);
    await iam.putRolePolicy({
      RoleName: this.getIAMRoleName(),
      PolicyName: DEFAULT_IAM_POLICY_NAME,
      PolicyDocument: policyDocument
    });

    await sleep(3000); // Wait 3 secs so AWS can replicate the role in all regions

    this._iamLambdaRole = {arn};
  },

  getIAMRoleName() {
    return this.executionRole || DEFAULT_IAM_ROLE_NAME;
  },

  getIAMClient() {
    if (!this._iamClient) {
      this._iamClient = new IAM(this.aws);
    }
    return this._iamClient;
  }
});
