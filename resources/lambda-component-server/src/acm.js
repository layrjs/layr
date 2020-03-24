import {task} from '@resdir/console';
import {ACM} from '@resdir/aws-client';
import {findACMCertificate, requestACMCertificate} from '@resdir/aws-helpers';
import {createClientError} from '@resdir/error';

export default () => ({
  async ensureACMCertificate(environment) {
    await task(
      async progress => {
        let certificate = await this.getACMCertificate({throwIfNotFound: false}, environment);
        if (!certificate) {
          progress.setMessage('Creating ACM Certificate...');
          progress.setOutro('ACM Certificate created');
          certificate = await this.createACMCertificate(environment);
        }
        return certificate;
      },
      {
        intro: `Checking ACM Certificate...`,
        outro: `ACM Certificate checked`
      },
      environment
    );
  },

  async getACMCertificate({throwIfNotFound = true} = {}, environment = undefined) {
    if (!this._acmCertificate) {
      this._acmCertificate = await findACMCertificate(
        {
          domainName: this.domainName,
          cnameAdder: this.ensureRoute53CNAME.bind(this),
          managerIdentifier: this.MANAGER_IDENTIFIER,
          acm: this.getACMClient()
        },
        environment
      );
    }

    if (!this._acmCertificate && throwIfNotFound) {
      throw createClientError('ACM Certificate not found');
    }

    return this._acmCertificate;
  },

  async createACMCertificate(environment) {
    const certificate = await requestACMCertificate(
      {
        domainName: this.domainName,
        cnameAdder: this.ensureRoute53CNAME.bind(this),
        managerIdentifier: this.MANAGER_IDENTIFIER,
        acm: this.getACMClient()
      },
      environment
    );

    this._acmCertificate = certificate;

    return certificate;
  },

  getACMRegion() {
    return this.getNormalizedEndpointType() === 'REGIONAL' ? this.aws.region : 'us-east-1';
  },

  getACMClient() {
    if (!this._acmClient) {
      this._acmClient = new ACM({
        profile: this.aws.profile,
        accessKeyId: this.aws.accessKeyId,
        secretAccessKey: this.aws.secretAccessKey,
        region: this.getACMRegion()
      });
    }
    return this._acmClient;
  }
});
