### Bringing Some Routes

So far, our ["Guestbook"](https://liaison.dev/docs/v1/introduction/web-app) application was displaying all its content on a single page, so we didn't have to use routes to match different URLs to different pages.

But now, we're going to add a new page that will allow the user to edit an existing message. So, we'll need some routes:

- `'/'` for the "home" page.
- `'/messages/:id'` for the "edit message" page.

Let's see how to achieve that with Liaison.

> TLDR: The completed project is available in the <!-- <if language="js"> -->[Liaison repository](https://github.com/liaisonjs/liaison/tree/master/examples/guestbook-web-with-routes-js)<!-- </if> --><!-- <if language="ts"> -->[Liaison repository](https://github.com/liaisonjs/liaison/tree/master/examples/guestbook-web-with-routes-ts)<!-- </if> -->.

#### Preparing the Project

You can duplicate the [previous project](https://liaison.dev/docs/v1/introduction/web-app) or simply modify it in place.

#### Adding a Route to the Frontend

Since we're building a [single-page application](https://en.wikipedia.org/wiki/Single-page_application), the routes have to be implemented in the frontend, and the backend will remain unchanged.

In Liaison, a route is simply a method with a URL. Once a method has a URL, it can be called by this URL, and the outcome is the same as if it was called directly.

##### Making the `Guestbook` component "routable"

To associate a URL with a method of the `Guestbook` [component](https://liaison.dev/docs/v1/reference/component), we need this component to be "routable", and to do so we're going to use the [`Routable()`](https://liaison.dev/docs/v1/reference/routable) mixin.

First, install the `@liaison/routable` package:

```sh
npm install @liaison/routable
```

Next, add the following line at the beginning of the <!-- <if language="js"> -->`src/frontend.js`<!-- </if> --><!-- <if language="ts"> -->`src/frontend.tsx`<!-- </if> --> file to import the [`Routable()`](https://liaison.dev/docs/v1/reference/routable) mixin and the [`@route()`](https://liaison.dev/docs/v1/reference/routable#route-decorator) decorator:

```js
import {Routable, route} from '@liaison/routable';
```

Next, change the `Guestbook` class definition as follows:

```js
class Guestbook extends Routable(Component) {
  // ...
}
```

Now that the `Guestbook` component is routable, we can use the [`@route()`](https://liaison.dev/docs/v1/reference/routable#route-decorator) decorator to associate a URL to any of its static methods.

Change the `Home()` method as follows:

```js
@route('/') @view() static Home() {
  return (
    <div>
      <this.MessageList />
      <this.MessageCreator />
    </div>
  );
}
```

Voilà! Our `Home()` method (which is also a view) is now associated to the `'/'` URL, and it can be called with the Routable's [`callRouteByURL()`](https://liaison.dev/docs/v1/reference/routable#call-route-by-url-static-method) method:

```js
Guestbook.callRouteByURL('/'); // => Some React elements
```

Which is the same as:

```js
Guestbook.Home(); // => Some React elements
```

However, in a typical web application, you'll rarely call a method by using the `callRouteByURL()` method. Instead, you'll use a [router](https://liaison.dev/docs/v1/reference/router) to automatically call a route when the user navigates.

##### Adding a Router

First, let's import the [`useBrowserRouter()`](https://liaison.dev/docs/v1/reference/react-integration#use-browser-router-react-hook) React hook from the `@liaison/react-integration` package:

```js
import {useBrowserRouter} from '@liaison/react-integration';
```

Then, let's implement a new `Guestbook`'s view that will be in charge of creating a [`BrowserRouter`](https://liaison.dev/docs/v1/reference/browser-router) (using [`useBrowserRouter()`](https://liaison.dev/docs/v1/reference/react-integration#use-browser-router-react-hook)), calling the current route (with [`callCurrentRoute()`](https://liaison.dev/docs/v1/reference/router#call-current-route-instance-method)), and rendering the result (`content`) inside a minimal layout:

```js
@view() static Root() {
  const [router, isReady] = useBrowserRouter(this);

  if (!isReady) {
    return null;
  }

  const content = router.callCurrentRoute({
    fallback: () => 'Sorry, there is nothing here.'
  });

  return (
    <div style={{maxWidth: '700px', margin: '40px auto'}}>
      <h1>Guestbook</h1>
      {content}
    </div>
  );
}
```

This view is named "Root" because it will be the new root view of our application. So all we have to do now is to change the view that is mounted by React when the application starts.

To do so, change the following line:

```js
ReactDOM.render(<Guestbook.Home />, document.getElementById('root'));
```

As follows:

```js
ReactDOM.render(<Guestbook.Root />, document.getElementById('root'));
```

Congrats! Our application is now equipped with a router, and it's a great step forward because we can now add new pages. But before that, let's start the application to make sure we didn't break anything.

#### Starting the Application

First, start the backend:

```sh
// JS

npx babel-node ./src/backend.js
```

```sh
// TS

npx ts-node ./src/backend.ts
```

Next, start the frontend:

```sh
npx webpack-dev-server
```

Lastly, open [http://localhost:8080/](http://localhost:8080/) in a browser, and if everything went well, you should see the same display as [before](https://liaison.dev/docs/v1/introduction/web-app#starting-the-frontend).

#### Adding the "Edit Message" Page

Now that we have a router in place, it is easy to add the "edit message" page. All we have to do is to implement a new view and use the [`@route()`](https://liaison.dev/docs/v1/reference/routable#route-decorator) decorator to provide a URL.

First, import a new React hook that we're going to use:

```js
import {useAsyncMemo} from '@liaison/react-integration';
```

Then, add the following view inside the `Guestbook` component:

```js
// JS

@route('/messages/:id') @view() static MessageEditor({id}) {
  const {Message} = this;

  const [
    {existingMessage, editedMessage} = {},
    isLoading,
    loadingError
  ] = useAsyncMemo(async () => {
    const existingMessage = await Message.get(id, {text: true});
    const editedMessage = existingMessage.fork();
    return {existingMessage, editedMessage};
  }, [id]);

  const saveMessage = useCallback(async () => {
    await editedMessage.save();
    existingMessage.merge(editedMessage);
    this.Home.navigate();
  }, [existingMessage, editedMessage]);

  if (isLoading) {
    return null;
  }

  if (loadingError) {
    return (
      <p style={{color: 'red'}}>
        Sorry, an error occurred while loading a guestbook’s message.
      </p>
    );
  }

  return (
    <div>
      <h2>Edit a Message</h2>
      <editedMessage.Form onSubmit={saveMessage} />
    </div>
  );
}
```

```ts
// TS

@route('/messages/:id') @view() static MessageEditor({id}: {id: string}) {
  const {Message} = this;

  const [
    {existingMessage, editedMessage} = {} as const,
    isLoading
  ] = useAsyncMemo(async () => {
    const existingMessage = await Message.get(id, {text: true});
    const editedMessage = existingMessage.fork();
    return {existingMessage, editedMessage};
  }, [id]);

  const saveMessage = useCallback(async () => {
    await editedMessage!.save();
    existingMessage!.merge(editedMessage!);
    this.Home.navigate();
  }, [existingMessage, editedMessage]);

  if (isLoading) {
    return null;
  }

  if (editedMessage === undefined) {
    return (
      <p style={{color: 'red'}}>
        Sorry, an error occurred while loading a guestbook’s message.
      </p>
    );
  }

  return (
    <div>
      <h2>Edit a Message</h2>
      <editedMessage.Form onSubmit={saveMessage} />
    </div>
  );
}
```

Besides some React code, we've used some new Liaison's features that deserve an explanation.

The `MessageEditor()` view is associated to the `'/messages/:id'` [URL pattern](https://liaison.dev/docs/v1/reference/route#url-pattern-type), where the `:id` part represents a parameter specifying the `id` of a message. So, for example, if the user navigates to `'/messages/abc123'`, the `MessageEditor()` method will be called with the following parameter: `{id: 'abc123'}`.

We use the [`useAsyncMemo()`](https://liaison.dev/docs/v1/reference/react-integration#use-async-memo-react-hook) hook to track the loading of the message. Right after the message was loaded (`existingMessage`) with the `StorableComponent`'s [`get()`](https://liaison.dev/docs/v1/reference/storable#get-class-method) method, we fork it (`editedMessage`) by using the Component's [`fork()`](https://liaison.dev/docs/v1/reference/component#fork-instance-method) method. Component forking is a unique feature of Liaison. In a nutshell, forking is like copying, except that it is extremely fast and memory efficient.

To explain why we need to fork the loaded message, we need to talk a bit about how Liaison is managing the instances of a component. When a component instance has a [primary identifier](https://liaison.dev/docs/v1/reference/primary-identifier-attribute) (e.g., an `id` attribute), it is managed by an [identity map](https://liaison.dev/docs/v1/reference/identity-map) that ensures that in the whole application there can only be one component instance with a specific identifier.

So, for example, if we load the same message twice, we get two references to the same `Message` instance:

```js
const message1 = await Message.get({id: 'abc123'});
const message2 = await Message.get({id: 'abc123'});

message1 === message2; // => true
```

Therefore, when we load a message in the `MessageEditor()` view, we are getting the same `Message` instance that was previously loaded in the `MessageList()` view. However, we don't want the user to modify the message that is displayed in the `MessageList()` view until it is saved to the backend, and this is why we have to fork it.

The `saveMessage()` callback does three things:

1. It [saves](https://liaison.dev/docs/v1/reference/storable#save-instance-method) the message fork (`editedMessage`) to the backend.
2. It [merges](https://liaison.dev/docs/v1/reference/component#merge-instance-method) the message fork (`editedMessage`) into the original message (`existingMessage`) so the changes made by the user can be reflected in the `MessageList()` view.
3. It [navigates](https://liaison.dev/docs/v1/reference/route#navigate-instance-method) to the Guestbook's `Home` view.

The rest of the `MessageEditor()` view is just regular React code.

#### Navigating to the `MessageEditor()` View

There is only one thing left to do. We need to display a link so the user can navigate to the `MessageEditor()` view.

In the `MessageList()` view, add the following lines right after the `<message.Viewer />` JSX expression:

```js
<div style={{marginTop: '5px'}}>
  <this.MessageEditor.Link params={message}>Edit</this.MessageEditor.Link>
</div>
```

What's going on there? `MessageEditor()` being both a view (thanks to the the [`@view()`](https://liaison.dev/docs/v1/reference/react-integration#view-decorator) decorator) and a route (thanks to the [`@route()`](https://liaison.dev/docs/v1/reference/routable#route-decorator) decorator), we're automatically getting an handy `Link()` React component that we can use to display a link (rendered as an `<a>` HTML tag) so the user can navigate to the `MessageEditor()` view.

How does the `MessageEditor()` view know which message to edit? The current `message` being specified in the `params` attribute of the `Link()` React component, the `MessageEditor()` view is executed with the `message` as first parameter.

#### Testing the Application

You should now see an "Edit" link below each message:

<p>
	<img src="https://liaison-blog.s3.dualstack.us-west-2.amazonaws.com/images/guestbook-screen-3.png" alt="Screenshot of the guestbook app showing an 'Edit' link" style="width: 100%; margin-top: .5rem">
</p>

And when you click on an "Edit" link, you should see something like this:

<p>
	<img src="https://liaison-blog.s3.dualstack.us-west-2.amazonaws.com/images/guestbook-screen-4.png" alt="Screenshot of the guestbook app showing the 'Edit Message' page" style="width: 100%; margin-top: .5rem">
</p>

Modify a message, click the "Submit" button, and you should be back at the home page showing the modified message.

#### Wrapping Up

We've added a new page to our "Guestbook" application so the user can edit a message, and along the way, we've discovered how to implement routing by using a [`BrowserRouter`](https://liaison.dev/docs/v1/reference/browser-router) and some [routes](https://liaison.dev/docs/v1/reference/route). Also, we got a glimpse of some of the most powerful features of Liaison — [component forking](https://liaison.dev/docs/v1/reference/component#forking) and [identity mapping](https://liaison.dev/docs/v1/reference/identity-map).
