module.exports = () => {
  const frontendURL = process.env.FRONTEND_URL;

  if (!frontendURL) {
    throw new Error(`'FRONTEND_URL' environment variable is missing`);
  }

  const domainName = new URL(frontendURL).hostname;

  return {
    type: 'website',
    provider: 'aws',
    domainName,
    files: ['./public'],
    customErrors: [{errorCode: 404, responseCode: 200, responsePage: 'index.html'}],
    aws: {
      region: 'us-west-2',
      cloudFront: {
        priceClass: 'PriceClass_100'
      }
    }
  };
};
