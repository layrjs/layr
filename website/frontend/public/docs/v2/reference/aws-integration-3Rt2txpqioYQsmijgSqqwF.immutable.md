### aws-integration <badge type="primary">module</badge> {#aws-integration-module}

Allows you to host a [component server](https://layrjs.com/docs/v2/reference/component-server) in [AWS Lambda](https://aws.amazon.com/lambda/).

#### Functions

##### `createAWSLambdaHandler(componentServer)` <badge type="tertiary-outline">function</badge> {#create-aws-lambda-handler-function}

Creates an [AWS Lambda function handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html) for the specified [ComponentServer](https://layrjs.com/docs/v2/reference/component-server) instance.

Alternatively, you can pass a [`Component`](https://layrjs.com/docs/v2/reference/component) class or a function (which can be asynchronous) returning a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) instance or a [`Component`](https://layrjs.com/docs/v2/reference/component) class. When a [`Component`](https://layrjs.com/docs/v2/reference/component) class is passed (or returned from a passed function), a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) instance is automatically created from the [`Component`](https://layrjs.com/docs/v2/reference/component) class.

The created handler can be hosted in [AWS Lambda](https://aws.amazon.com/lambda/) and consumed by [AWS API Gateway](https://aws.amazon.com/api-gateway/) through an [HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).

**Parameters:**

* `componentServer`: A [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) instance, a [`Component`](https://layrjs.com/docs/v2/reference/component), or a function (which can be asynchronous) returning a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) instance or a [`Component`](https://layrjs.com/docs/v2/reference/component).

**Returns:**

An [AWS Lambda function handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html).

**Example:**

```
import {Component, attribute, expose} from '@layr/component';
import {ComponentServer} from '@layr/component-server';
import {createAWSLambdaHandler} from '@layr/aws-integration';

class Movie extends Component {
  @expose({get: true, set: true}) @attribute('string') title = '';
}

const server = new ComponentServer(Movie);

const handler = createAWSLambdaHandler(server);

export {handler};
```
