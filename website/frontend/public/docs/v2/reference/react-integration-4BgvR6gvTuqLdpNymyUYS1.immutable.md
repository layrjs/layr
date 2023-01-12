### react-integration <badge type="primary">module</badge> {#react-integration-module}

Provides some React components, hooks, and decorators to simplify the use of [React](https://reactjs.org/) inside a Layr app.

#### React Components

##### `BrowserRootView()` <badge type="tertiary-outline">react component</badge> {#browser-root-view-react-component}

A React component providing sensible defaults for a web app.

You should use this component once at the top of your app.

Note that if you use [Boostr](https://boostr.dev/) to manage your app development, this component will be automatically mounted, so you don't have to use it explicitly in your code.

The main point of this component is to provide the default behavior of high-level hooks such as [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) or [`useAction()`](https://layrjs.com/docs/v2/reference/react-integration#use-action-react-hook):

- `useData()` will render `null` while the `getter()` function is running, and, in the case an error is thrown, a `<div>` containing an error message will be rendered.
- `useAction()` will prevent the user from interacting with any UI element in the browser page while the `handler()` function is running, and, in the case an error is thrown, the browser's `alert()` function will be called to display the error message.

**Example:**

See an example of use in the [`BrowserNavigatorView`](https://layrjs.com/docs/v2/reference/react-integration#browser-navigator-view-react-component) React component.
##### `BrowserNavigatorView(props)` <badge type="tertiary-outline">react component</badge> {#browser-navigator-view-react-component}

A React component providing a [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator#browser-navigator-class) to your app.

You should use this component once at the top of your app after the [`BrowserRootView`](https://layrjs.com/docs/v2/reference/react-integration#browser-root-view-react-component) component.

Note that if you use [Boostr](https://boostr.dev/) to manage your app development, this component will be automatically mounted, so you don't have to use it explicitly in your code.

**Parameters:**

* `props`:
  * `rootComponent`: The root Layr component of your app. Note that this Layr component should be [`Routable`](https://layrjs.com/docs/v2/reference/routable#routable-component-class).

**Example:**

```
// JS

import React, {Fragment} from 'react';
import ReactDOM from 'react-dom';
import {Component} from '@layr/component';
import {Routable} from '@layr/routable';
import {BrowserRootView, BrowserNavigatorView, layout, page} from '@layr/react-integration';

class Application extends Routable(Component) {
  // `@layout('/')` is a shortcut for `@wrapper('/') @view()`
  @layout('/') static MainLayout({children}) {
    return (
      <>
        <this.HomePage.Link>
          <h1>My App</h1>
        </this.HomePage.Link>

        {children()} // Renders the subcomponents using this layout
      </>
    );
  }

  // `@page('[/]')` is a shortcut for `@route('[/]') @view()`
  @page('[/]') static HomePage() {
    return <p>Hello, World!</p>;
  }
}

// Note that you don't need the following code when you use Boostr
ReactDOM.render(
  <BrowserRootView>
    <BrowserNavigatorView rootComponent={Application} />
  </BrowserRootView>,
  // Your `index.html` page should contain `<div id="root"></div>`
  document.getElementById('root')
);
```
```
// TS

import React, {Fragment} from 'react';
import ReactDOM from 'react-dom';
import {Component} from '@layr/component';
import {Routable} from '@layr/routable';
import {BrowserRootView, BrowserNavigatorView, layout, page} from '@layr/react-integration';

class Application extends Routable(Component) {
  // `@layout('/')` is a shortcut for `@wrapper('/') @view()`
  @layout('/') static MainLayout({children}: {children: () => any}) {
    return (
      <>
        <this.HomePage.Link>
          <h1>My App</h1>
        </this.HomePage.Link>

        {children()} // Renders the subcomponents using this layout
      </>
    );
  }

  // `@page('[/]')` is a shortcut for `@route('[/]') @view()`
  @page('[/]') static HomePage() {
    return <p>Hello, World!</p>;
  }
}

// Note that you don't need the following code when you use Boostr
ReactDOM.render(
  <BrowserRootView>
    <BrowserNavigatorView rootComponent={Application} />
  </BrowserRootView>,
  // Your `index.html` page should contain `<div id="root"></div>`
  document.getElementById('root')
);
```

##### `Customizer([props])` <badge type="tertiary-outline">react component</badge> {#customizer-react-component}

A React component allowing you to customize the behavior of high-level hooks such as [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) or [`useAction()`](https://layrjs.com/docs/v2/reference/react-integration#use-action-react-hook).

**Parameters:**

* `props`:
  * `dataPlaceholder`: A function returning a React element (or `null`) that is rendered while the `getter()` function of the [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) hook is running. A typical use case is to render a spinner.
  * `errorRenderer`: A function returning a React element (or `null`) that is rendered when the `getter()` function of the [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) hook throws an error. The `errorRenderer()` function receives the error as first parameter. A typical use case is to render an error message.
  * `actionWrapper`: An asynchronous function allowing you to wrap the `handler()` function of the [`useAction()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) hook. The `actionWrapper()` function receives the `handler()` function as first parameter, should execute it, and return its result. A typical use case is to lock the screen while the `handler()` function is running so the user cannot interact with any UI element.
  * `errorNotifier`: An asynchronous function that is executed when the `handler()` function of the [`useAction()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) hook throws an error. The `errorNotifier()` function receives the error as first parameter. A typical use case is to display an error alert dialog.

**Example:**

```
<Customizer
  dataPlaceholder={() => {
    // Renders a custom `LoadingSpinner` component
    return <LoadingSpinner />;
  }}
  errorRenderer={(error) => {
    // Renders a custom `ErrorMessage` component
    return <ErrorMessage>{error}</ErrorMessage>;
  }}
  actionWrapper={async (actionHandler, args) => {
    // Do whatever you want here (e.g., custom screen locking)
    try {
      return await actionHandler(...args);
    } finally {
      // Do whatever you want here (e.g., custom screen unlocking)
    }
  }}
  errorNotifier={async (error) => {
    // Calls a custom `alert()` asynchronous function
    await alert(error.message);
  }}
>
  <YourChildComponent />
</Customizer>
```

#### High-Level Hooks

##### `useNavigator()` <badge type="tertiary-outline">react hook</badge> {#use-navigator-react-hook}

A hook allowing you to get the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#navigator-class) used in your app.

**Returns:**

A [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#navigator-class) instance.

**Example:**

```
import {Component} from '@layr/component';
import {Routable} from '@layr/routable';
import React from 'react';
import {view, useNavigator} from '@layr/react-integration';

import logo from '../assets/app-logo.svg';

class Application extends Routable(Component) {
  // ...

  @view() static LogoView() {
    const navigator = useNavigator();

    return <img src={logo} onClick={() => { navigator.navigate('/); }} />;
  }
}
```

##### `useData(getter, renderer, [dependencies], [options])` <badge type="tertiary-outline">react hook</badge> {#use-data-react-hook}

A convenience hook for loading data asynchronously and rendering a React element using the loaded data.

The `getter()` asynchronous function is called when the React component is rendered for the first time and when a change is detected in its `dependencies`.

While the `getter()` function is running, the `useData()` hook returns the result of the nearest `dataPlaceholder()` function, which can be defined in any parent component thanks to the [`Customizer`](https://layrjs.com/docs/v2/reference/react-integration#customizer-react-component) component.

Once the `getter()` function is executed, the `useData()` hook returns the result of the `renderer()` function which is called with the result of the `getter()` function as first parameter.

If an error occurs during the `getter()` function execution, the `useData()` hook returns the result of the nearest `errorRenderer()` function, which can be defined in any parent component thanks to the [`Customizer`](https://layrjs.com/docs/v2/reference/react-integration#customizer-react-component) component.

**Parameters:**

* `getter`: An asynchronous function for loading data.
* `renderer`: A function which is called with the result of the `getter()` function as first parameter and a `refresh()` function as second parameter. You can call the `refresh()` function to force the re-execution of the `getter()` function. The `renderer()` function should return a React element (or `null`).
* `dependencies`: An array of values on which the `getter()` function depends (default: `[]`).
* `options`:
  * `dataPlaceholder`: A custom `dataPlaceholder()` function.
  * `errorRenderer`: A custom `errorRenderer()` function.

**Returns:**

A React element (or `null`).

**Example:**

```
import {Component} from '@layr/component';
import React from 'react';
import {view, useData} from '@layr/react-integration';

class Article extends Component {
  // ...

  @view() static List() {
    return useData(
      async () => {
        // Return some articles from the backend
      },

      (articles) => {
        return articles.map((article) => (
          <div key={article.id}>{article.title}</div>
        ));
      }
    );
  }
}
```

##### `useAction(handler, [dependencies], [options])` <badge type="tertiary-outline">react hook</badge> {#use-action-react-hook}

A convenience hook for executing some asynchronous actions.

The specified `handler()` asynchronous function is wrapped so that:

- When running, the screen is locked to prevent the user from interacting with any UI element. You can customize the screen locking mechanism in any parent component thanks to the [Customizer's `actionWrapper()`](https://layrjs.com/docs/v2/reference/react-integration#customizer-react-component) prop.
- In case an error is thrown, an error alert dialog is displayed. You can customize the error alert dialog in any parent component thanks to the [Customizer's `errorNotifier()`](https://layrjs.com/docs/v2/reference/react-integration#customizer-react-component) prop.

**Parameters:**

* `handler`: An asynchronous function implementing the action.
* `dependencies`: An array of values on which the `handler()` function depends (default: `[]`).
* `options`:
  * `actionWrapper`: A custom `actionWrapper()` function.
  * `errorNotifier`: A custom `errorNotifier()` function.

**Returns:**

An asynchronous function wrapping the specified `handler()`.

**Example:**

```
import {Component} from '@layr/component';
import React from 'react';
import {view, useAction} from '@layr/react-integration';

class Article extends Component {
  // ...

  @view() EditView() {
    const save = useAction(async () => {
      // Save the edited article to the backend
    });

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div>
          Implement your form fields here.
        </div>

        <div>
          <button type="submit">Save</button>
        </div>
      </form>
    );
  }
}
```

##### `useObserve(observable)` <badge type="tertiary-outline">react hook</badge> {#use-observe-react-hook}

Makes a view dependent of an [observable](https://layrjs.com/docs/v2/reference/observable#observable-type) so the view is automatically re-rendered when the observable changes.

**Parameters:**

* `observable`: An [observable](https://layrjs.com/docs/v2/reference/observable#observable-type) object.

**Example:**

```
import {Component} from '@layr/component';
import {createObservable} from '@layr/observable';
import React from 'react';
import {view, useObserve} from '@layr/react-integration';

const observableArray = createObservable([]);

class MyComponent extends Component {
  @view() static View() {
    useObserve(observableArray);

    return (
      <div>
        {`observableArray's length: ${observableArray.length}`}
      </div>
    );
  }
}

// Changing `observableArray` will re-render `MyComponent.View`
observableArray.push('abc');
```

#### Decorators

##### `@view()` <badge type="tertiary">decorator</badge> {#view-decorator}

Decorates a method of a Layr [component](https://layrjs.com/docs/v2/reference/component) so it be can used as a React component.

Like any React component, the method can receive some properties as first parameter and return some React elements to render.

The decorator binds the method to a specific component, so when the method is executed by React (via, for example, a reference included in a [JSX expression](https://reactjs.org/docs/introducing-jsx.html)), it has access to the bound component through `this`.

Also, the decorator observes the attributes of the bound component, so when the value of an attribute changes, the React component is automatically re-rendered.

**Example:**

```
import {Component, attribute} from '@layr/component';
import React from 'react';
import ReactDOM from 'react-dom';
import {view} from '@layr/react-integration';

class Person extends Component {
  @attribute('string') firstName = '';

  @attribute('string') lastName = '';

  @view() FullName() {
    return <span>{`${this.firstName} ${this.fullName}`}</span>;
  }
}

const person = new Person({firstName: 'Alan', lastName: 'Turing'});

ReactDOM.render(<person.FullName />, document.getElementById('root'));
```

##### `@page(pattern, [options])` <badge type="tertiary">decorator</badge> {#page-decorator}

A convenience decorator that combines the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) and [`@view()`](https://layrjs.com/docs/v2/reference/react-integration#view-decorator) decorators.

Typically, you should use this decorator to implement the pages of your app.

**Parameters:**

* `pattern`: The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the route.
* `options`: An object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the route is created.

**Example:**

See an example of use in the [`BrowserNavigatorView`](https://layrjs.com/docs/v2/reference/react-integration#browser-navigator-view-react-component) React component.
##### `@layout(pattern, [options])` <badge type="tertiary">decorator</badge> {#layout-decorator}

A convenience decorator that combines the [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) and [`@view()`](https://layrjs.com/docs/v2/reference/react-integration#view-decorator) decorators.

Typically, you should use this decorator to implement the layouts of your app.

**Parameters:**

* `pattern`: The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the wrapper.
* `options`: An object specifying the options to pass to the `Wrapper`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the wrapper is created.

**Example:**

See an example of use in the [`BrowserNavigatorView`](https://layrjs.com/docs/v2/reference/react-integration#browser-navigator-view-react-component) React component.
#### Low-Level Hooks

##### `useAsyncCallback(asyncCallback, [dependencies])` <badge type="tertiary-outline">react hook</badge> {#use-async-callback-react-hook}

Allows you to define an asynchronous callback and keep track of its execution.

Plays the same role as the React built-in [`useCallback()`](https://reactjs.org/docs/hooks-reference.html#usecallback) hook but works with asynchronous callbacks.

**Parameters:**

* `asyncCallback`: An asynchronous callback.
* `dependencies`: An array of values on which the asynchronous callback depends (default: `[]`).

**Returns:**

An array of the shape `[trackedCallback, isExecuting, error, result]` where `trackedCallback` is a function that you can call to execute the asynchronous callback, `isExecuting` is a boolean indicating whether the asynchronous callback is being executed, `error` is the error thrown by the asynchronous callback in case of failed execution, and `result` is the value returned by the asynchronous callback in case of succeeded execution.

**Example:**

```
import {Component} from '@layr/component';
import React from 'react';
import {view, useAsyncCallback} from '@layr/react-integration';

class Article extends Component {
  @view() UpvoteButton() {
    const [handleUpvote, isUpvoting, upvotingError] = useAsyncCallback(async () => {
      await this.upvote();
    });

    return (
      <div>
        <button onClick={handleUpvote} disabled={isUpvoting}>Upvote</button>
        {upvotingError && ' An error occurred while upvoting the article.'}
      </div>
    );
  }
}
```

##### `useAsyncMemo(asyncFunc, [dependencies])` <badge type="tertiary-outline">react hook</badge> {#use-async-memo-react-hook}

Memoizes the result of an asynchronous function execution and provides a "recompute function" that you can call to recompute the memoized result.

The asynchronous function is executed one time when the React component is rendered for the first time, and each time a dependency is changed or the "recompute function" is called.

Plays the same role as the React built-in [`useMemo()`](https://reactjs.org/docs/hooks-reference.html#usememo) hook but works with asynchronous functions and allows to recompute the memoized result.

**Parameters:**

* `asyncFunc`: An asynchronous function to compute the memoized result.
* `dependencies`: An array of values on which the memoized result depends (default: `[]`, which means that the memoized result will be recomputed only when the "recompute function" is called).

**Returns:**

An array of the shape `[memoizedResult, isExecuting, error, recompute]` where `memoizedResult` is the result returned by the asynchronous function in case of succeeded execution, `isExecuting` is a boolean indicating whether the asynchronous function is being executed, `error` is the error thrown by the asynchronous function in case of failed execution, and `recompute` is a function that you can call to recompute the memoized result.

**Example:**

```
import {Component} from '@layr/component';
import React from 'react';
import {view, useAsyncMemo} from '@layr/react-integration';

class Article extends Component {
  // ...

  @view() static List() {
    const [articles, isLoading, loadingError, retryLoading] = useAsyncMemo(
      async () => {
        // Return some articles from the backend
      }
    );

    if (isLoading) {
      return <div>Loading the articles...</div>;
    }

    if (loadingError) {
      return (
        <div>
          An error occurred while loading the articles.
          <button onClick={retryLoading}>Retry</button>
        </div>
      );
    }

    return articles.map((article) => (
      <div key={article.id}>{article.title}</div>
    ));
  }
}
```

##### `useRecomputableMemo(func, [dependencies])` <badge type="tertiary-outline">react hook</badge> {#use-recomputable-memo-react-hook}

Memoizes the result of a function execution and provides a "recompute function" that you can call to recompute the memoized result.

The function is executed one time when the React component is rendered for the first time, and each time a dependency is changed or the "recompute function" is called.

Plays the same role as the React built-in [`useMemo()`](https://reactjs.org/docs/hooks-reference.html#usememo) hook but with the extra ability to recompute the memoized result.

**Parameters:**

* `func`: A function to compute the memoized result.
* `dependencies`: An array of values on which the memoized result depends (default: `[]`, which means that the memoized result will be recomputed only when the "recompute function" is called).

**Returns:**

An array of the shape `[memoizedResult, recompute]` where `memoizedResult` is the result of the function execution, and `recompute` is a function that you can call to recompute the memoized result.

**Example:**

```
import {Component, provide} from '@layr/component';
import React, {useCallback} from 'react';
import {view, useRecomputableMemo} from '@layr/react-integration';

class Article extends Component {
  // ...
}

class Blog extends Component {
  @provide() static Article = Article;

  @view() static CreateArticleView() {
    const [article, resetArticle] = useRecomputableMemo(() => new Article());

    const createArticle = useCallback(async () => {
      // Save the created article to the backend
      resetArticle();
    }, [article]);

    return (
      <div>
        <article.CreateForm onSubmit={createArticle} />
      </div>
    );
  }
}
```

##### `useAsyncCall(asyncFunc, [dependencies])` <badge type="tertiary-outline">react hook</badge> {#use-async-call-react-hook}

Allows you to call an asynchronous function and keep track of its execution.

The function is executed one time when the React component is rendered for the first time, and each time a dependency is changed or the "recall function" is called.

**Parameters:**

* `asyncFunc`: The asynchronous function to call.
* `dependencies`: An array of values on which the asynchronous function depends (default: `[]`, which means that the asynchronous will be recalled only when the "recall function" is called).

**Returns:**

An array of the shape `[isExecuting, error, recall]` where `isExecuting` is a boolean indicating whether the asynchronous function is being executed, `error` is the error thrown by the asynchronous function in case of failed execution, and `recall` is a function that you can call to recall the asynchronous function.

**Example:**

```
// JS

import {Component, provide, attribute} from '@layr/component';
import React from 'react';
import {view, useAsyncCall} from '@layr/react-integration';

class Article extends Component {
  // ...
}

class Blog extends Component {
  @provide() static Article = Article;

  @attribute('Article[]?') static loadedArticles;

  @view() static View() {
    const [isLoading, loadingError, retryLoading] = useAsyncCall(
      async () => {
        this.loadedArticles = await this.Article.find();
      }
    );

    if (isLoading) {
      return <div>Loading the articles...</div>;
    }

    if (loadingError) {
      return (
        <div>
          An error occurred while loading the articles.
          <button onClick={retryLoading}>Retry</button>
        </div>
      );
    }

    return this.loadedArticles.map((article) => (
      <div key={article.id}>{article.title}</div>
    ));
  }
}
```
```
// TS

import {Component, provide, attribute} from '@layr/component';
import React from 'react';
import {view, useAsyncCall} from '@layr/react-integration';

class Article extends Component {
  // ...
}

class Blog extends Component {
  @provide() static Article = Article;

  @attribute('Article[]?') static loadedArticles?: Article[];

  @view() static View() {
    const [isLoading, loadingError, retryLoading] = useAsyncCall(
      async () => {
        this.loadedArticles = await this.Article.find();
      }
    );

    if (isLoading) {
      return <div>Loading the articles...</div>;
    }

    if (loadingError) {
      return (
        <div>
          An error occurred while loading the articles.
          <button onClick={retryLoading}>Retry</button>
        </div>
      );
    }

    return this.loadedArticles!.map((article) => (
      <div key={article.id}>{article.title}</div>
    ));
  }
}
```
