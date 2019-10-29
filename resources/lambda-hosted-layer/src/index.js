import main from './main';
import iam from './iam';
import lambda from './lambda';
import route53 from './route-53';
import acm from './acm';
import apiGateway from './api-gateway';

export default Resource => ({
  ...main(Resource),
  ...iam(Resource),
  ...lambda(Resource),
  ...route53(Resource),
  ...acm(Resource),
  ...apiGateway(Resource)
});
