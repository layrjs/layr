import {Route53} from '@resdir/aws-client';
import {ensureRoute53CNAME, ensureRoute53Alias} from '@resdir/aws-helpers';

export default () => ({
  async ensureRoute53CNAME({name, value}, environment) {
    return await ensureRoute53CNAME({name, value, route53: this.getRoute53Client()}, environment);
  },

  async ensureRoute53Alias({name, targetDomainName, targetHostedZoneId}, environment) {
    return await ensureRoute53Alias(
      {name, targetDomainName, targetHostedZoneId, route53: this.getRoute53Client()},
      environment
    );
  },

  getRoute53Client() {
    if (!this._route53Client) {
      this._route53Client = new Route53(this.aws);
    }
    return this._route53Client;
  }
});
