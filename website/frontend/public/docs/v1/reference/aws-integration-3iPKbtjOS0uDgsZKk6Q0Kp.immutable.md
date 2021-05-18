### aws-integration <badge type="primary">module</badge> {#aws-integration-module}

Allows you to host a [component server](https://layrjs.com/docs/v1/reference/component-server) in [AWS Lambda](https://aws.amazon.com/lambda/).

#### Functions

##### `createAWSLambdaHandlerForComponentServer(componentServer)` <badge type="tertiary-outline">function</badge> {#create-aws-lambda-handler-for-component-server-function}

Creates an [AWS Lambda function handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html) for the specified [component server](https://layrjs.com/docs/v1/reference/component-server).

The created handler can be hosted in [AWS Lambda](https://aws.amazon.com/lambda/) and consumed by [AWS API Gateway](https://aws.amazon.com/api-gateway/) through an [HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).

**Parameters:**

* `componentServer`: A [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server) instance.

**Returns:**

An [AWS Lambda function handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html).

**Example:**

```
import {Component, attribute, expose} from '@layr/component';
import {ComponentServer} from '@layr/component-server';
import {createAWSLambdaHandlerForComponentServer} from '@layr/aws-integration';

class Movie extends Component {
  @expose({get: true, set: true}) @attribute('string') title = '';
}

const server = new ComponentServer(Movie);

const handler = createAWSLambdaHandlerForComponentServer(server);

export {handler};
```
