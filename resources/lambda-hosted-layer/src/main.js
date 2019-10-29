export default () => ({
  RESOURCE_ID: 'liaison/lambda-hosted-layer',

  MANAGER_IDENTIFIER: 'liaison-lambda-hosted-layer-v1',

  async deploy(_input, environment) {
    await this.aroundDeploy(async () => {
      const iamLambdaRoleHasJustBeenCreated = await this.ensureIAMLambdaRole(environment);
      await this.createOrUpdateLambdaFunction({iamLambdaRoleHasJustBeenCreated}, environment);
      await this.ensureACMCertificate(environment);
      await this.createOrUpdateAPIGateway(environment);
      await this.createOrUpdateAPIGatewayDomainName(environment);
    });
  }
});
