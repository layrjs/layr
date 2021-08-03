### Handling Authorization

In the [previous guide](https://layrjs.com/docs/v2/introduction/routing), we added a feature to our "Guestbook" application so that the user can edit an existing message. We have a problem though. Currently, anyone can edit any message of the guestbook, and that's certainly not what we want. The ability to edit any message should be restricted to the administrator of the guestbook. So, how can we implement this restriction?

> TLDR: The completed project is available in the <!-- <if language="js"> -->[Layr repository](https://github.com/layrjs/layr/tree/master/examples/guestbook-web-with-authorization-js)<!-- </if> --><!-- <if language="ts"> -->[Layr repository](https://github.com/layrjs/layr/tree/master/examples/guestbook-web-with-authorization-ts)<!-- </if> -->.

#### Preparing the Project

You can duplicate the [previous project](https://layrjs.com/docs/v2/introduction/routing) or simply modify it in place.

#### Modifying the Backend

To restrict the use of a particular feature to a user, we need to be able to:

1. Authenticate the user.
2. Authorize the authenticated user to use a particular feature.

To keep this guide simple, we're going to fully implement only the authorization part of the mechanism. For the authentication part, we'll "cheat" a bit by implementing a minimal authentication system based on a secret shared between the frontend and the backend.

> For an example of a full authentication system with user registration and password verification, you can have a look at the Layr's [RealWorld example](https://github.com/layrjs/react-layr-realworld-example-app) implementation.

##### Authenticating the User

Let's start by implementing the authentication system.

In the <!-- <if language="js"> -->`src/backend.js`<!-- </if> --><!-- <if language="ts"> -->`src/backend.ts`<!-- </if> --> file, define a new `Session` component just before the `Message` component:

```js
// JS

export class Session extends Component {
  @expose({set: true})
  @attribute('string?')
  static secret;

  static isAdmin() {
    return this.secret === process.env.ADMIN_SECRET;
  }
}
```

```ts
// TS

export class Session extends Component {
  @expose({set: true})
  @attribute('string?')
  static secret?: string;

  static isAdmin() {
    return this.secret === process.env.ADMIN_SECRET;
  }
}
```

This component will be in charge of handling a user's session and is made of:

- A `secret` attribute that can be set from the frontend thanks to the [`@expose()`](https://layrjs.com/docs/v2/reference/component#expose-decorator) decorator.
- An `isAdmin()` method that compares the value of the `secret` attribute with the value of an `ADMIN_SECRET` environment variable which is available only in the backend.

Voilà! We've implemented our minimal authentication system in the backend.

##### Authorizing the User

Currently, we already have some sort of authorizations in the backend, but they are pretty binary. We've used the [`@expose()`](https://layrjs.com/docs/v2/reference/component#expose-decorator) decorator to expose some methods to the frontend:

```js
@expose({
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: true}
  }
})
```

By specifying `{call: true}`, we've indicated that the `call` operation of a certain method is always authorized. So, for example, the `save()` method can be called by anyone from the frontend. But that's not what we want. We'd like the `save()` method to be callable only by the creator of a new message or by an administrator.

So, first, modify the class exposure as follows:

```js
@expose({
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: ['creator', 'admin']}
  }
})
```

So now the `save()` method is callable only by a `'creator'` (of a new message) or an `'admin'`. The strings `'creator'` and `'admin'` represent the names of some roles that we're going to define.

First, install the `@layr/with-roles` package:

```sh
npm install @layr/with-roles
```

Next, add the following line at the beginning of the <!-- <if language="js"> -->`src/backend.js`<!-- </if> --><!-- <if language="ts"> -->`src/backend.ts`<!-- </if> --> file to import the [`WithRoles()`](https://layrjs.com/docs/v2/reference/with-roles) mixin and the [`@role()`](https://layrjs.com/docs/v2/reference/with-roles#role-decorator) decorator:

```js
import {WithRoles, role} from '@layr/with-roles';
```

Next, change the `Message` class definition as follows:

```js
export class Message extends WithRoles(Storable(Component)) {
  // ...
}
```

By using the [`WithRoles()`](https://layrjs.com/docs/v2/reference/with-roles) mixin, we've given the `Message` class the ability to handle roles.

Next, add the following lines inside the `Message` class to define the roles that we need:

```js
@role('creator') creatorRoleResolver() {
  return this.isNew();
}

@role('admin') static adminRoleResolver() {
  return this.Session.isAdmin();
}
```

A [role](https://layrjs.com/docs/v2/reference/role) is defined by a name and a method that should return a boolean indicating whether the user has a specific role.

The `creatorRoleResolver()` method simply returns the result of the [`isNew()`](https://layrjs.com/docs/v2/reference/component#is-new-instance-method) method. So when a message is new, the user gets the `creator` role.

The `adminRoleResolver()` method is calling the `Session.isAdmin()` method to determine whether the user as the `'admin'` role. Notice that since the `adminRoleResolver()` method doesn't depend on a particular message, it can be defined as a class method (with the `static` keyword).

Next, add the following line inside the `Message` class (preferably at the beginning) to make the `Message` component aware of the `Session` component:

```js
@provide() static Session = Session;
```

Lastly, since we are using the [`@provide()`](https://layrjs.com/docs/v2/reference/component#provide-decorator) decorator, we need to import it by modifying the first line of the file as follows:

```js
import {Component, provide, expose, validators} from '@layr/component';
```

#### Testing the Application

Start the backend with the following command:

```sh
// JS

ADMIN_SECRET=xyz123 npx babel-node ./src/backend.js
```

```sh
// TS

ADMIN_SECRET=xyz123 npx ts-node ./src/backend.ts
```

Notice how we specified the `ADMIN_SECRET` environment variable so the backend can get it from `process.env.ADMIN_SECRET`.

Next, start the frontend in another terminal:

```sh
npx webpack serve --mode=development
```

Lastly, open [http://localhost:8080/](http://localhost:8080/) in a browser.

You should see the same thing as [before](https://layrjs.com/docs/v2/introduction/routing#testing-the-application), except that when you try to submit an edited message, you should see the following message:

```json
Sorry, an error occurred while submitting your message.
```

And if you open the browser's console, you should see the following error:

```json
Error: Cannot execute a method that is not allowed (name: 'save')
```

That's all good! It means that the backend is now protected against unauthorized message modifications.

#### Modifying the Frontend

We want to allow the administrator to edit some messages, and to do this we need to find a way to send the administrator's secret to the backend.

It's actually quite easy. All we need to do is to extend the `Session` component in the frontend so the value of the `secret` attribute can be set by the user. We could implement a user interface for that, but once again, we'll make it as simple as possible. So we'll read the secret from the browser's [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) and we'll let the administrator set its secret manually by using the browser's developer tools.

In the <!-- <if language="js"> -->`src/frontend.js`<!-- </if> --><!-- <if language="ts"> -->`src/frontend.tsx`<!-- </if> --> file, add the following code just before the `Message` component:

```js
// JS

class Session extends BackendMessage.Session {
  @attribute('string?', {
    getter() {
      return window.localStorage.getItem('secret') || undefined;
    }
  })
  static secret;
}
```

```ts
// TS

class Session extends BackendMessage.Session {
  @attribute('string?', {
    getter() {
      return window.localStorage.getItem('secret') || undefined;
    }
  })
  static secret?: string;
}
```

So now, the `Session.secret` attribute can get its value, thanks to the [`getter`](https://layrjs.com/docs/v2/reference/attribute#constructor) option, from the browser's [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Lastly, we need to make sure that the `Message` component is aware of the new `Session` component. So add the following line inside the `Message` class (preferably at the beginning):

```js
@provide() static Session = Session;
```

Done! The administrator should now be able to edit a message.

#### Testing the Application Again

Open the browser's developer tools, and add the following entry in the local storage:

| Key    | Value  |
| ------ | ------ |
| secret | xyz123 |

If you are using [Chrome](https://www.google.com/chrome/), you should have something like this:

<p>
	<img src="https://liaison-blog.s3.dualstack.us-west-2.amazonaws.com/images/guestbook-screen-5.png" alt="Screenshot of the Chrome's developer tools showing how to set the secret's value in the local storage" style="width: 100%; margin-top: .5rem">
</p>

Now, try to edit a message again, and this time it should work.

#### Polishing the Frontend

Everything works fine, but to improve the user experience, we should hide the "Edit" link when the user is not an administrator.

In the `MessageList()` view of the `Guestbook` component, modify the following lines:

```js
<div style={{marginTop: '5px'}}>
  <this.MessageEditor.Link params={message}>Edit</this.MessageEditor.Link>
</div>
```

As follows:

<!-- prettier-ignore -->
```js
{Message.Session.secret && (
  <div style={{marginTop: '5px'}}>
    <this.MessageEditor.Link params={message}>Edit</this.MessageEditor.Link>
  </div>
)}
```

So now, the "Edit" link should be displayed only when the `Session.secret` is set. You can check that it works by removing the secret from the local storage and reloading the guestbook's home page.

#### Wrapping Up

You've implemented an authorization mechanism so the guestbook's messages can only be edited by an administrator.

Well done! Our "Guestbook" application is now completed. It was pretty easy, wasn't it?

At this point, you should be able to grasp the main concepts of Layr. More advanced guides will be available soon, but in the meantime, please head over to the "Reference" section of the documentation for a comprehensive description of the Layr API.
