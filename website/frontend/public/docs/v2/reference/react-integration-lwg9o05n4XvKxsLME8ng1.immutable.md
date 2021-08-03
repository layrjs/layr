### react-integration <badge type="primary">module</badge> {#react-integration-module}

Provides a decorator and a number of hooks to simplify the use of [React](https://reactjs.org/) inside a Layr [component](https://layrjs.com/docs/v2/reference/component).

#### Decorators

##### `@view()` <badge type="tertiary">decorator</badge> {#view-decorator}

Decorates a method of a Layr [component](https://layrjs.com/docs/v2/reference/component) so it be can used as a React component.

Like any React component, the method can receive some properties as first parameter and return some [React elements](https://reactjs.org/docs/rendering-elements.html) to render (or `null` if it doesn't render anything).

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

#### Hooks

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

// Changing `observableArray` will re-render `MyComponent.View()`
observableArray.push('abc');
```

##### `useAsyncCallback(asyncCallback, dependencies)` <badge type="tertiary-outline">react hook</badge> {#use-async-callback-react-hook}

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

##### `useAsyncMemo(asyncFunc, dependencies)` <badge type="tertiary-outline">react hook</badge> {#use-async-memo-react-hook}

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
import {Storable} from '@layr/storable';
import React from 'react';
import {view, useAsyncMemo} from '@layr/react-integration';

class Article extends Storable(Component) {
  // ...

  @view() static List() {
    const [articles, isLoading, loadingError, retryLoading] = useAsyncMemo(
      async () => {
        return await this.find();
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

##### `useRecomputableMemo(func, dependencies)` <badge type="tertiary-outline">react hook</badge> {#use-recomputable-memo-react-hook}

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
import {Storable} from '@layr/storable';
import React, {useCallback} from 'react';
import {view, useRecomputableMemo} from '@layr/react-integration';

class Article extends Storable(Component) {
  // ...
}

class Blog extends Component {
  @provide() static Article = Article;

  @view() static ArticleCreator() {
    const [article, resetArticle] = useRecomputableMemo(() => new Article());

    const createArticle = useCallback(async () => {
      await article.save();
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

##### `useAsyncCall(asyncFunc, dependencies)` <badge type="tertiary-outline">react hook</badge> {#use-async-call-react-hook}

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
import {Storable} from '@layr/storable';
import React from 'react';
import {view, useAsyncCall} from '@layr/react-integration';

class Article extends Storable(Component) {
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
import {Storable} from '@layr/storable';
import React from 'react';
import {view, useAsyncCall} from '@layr/react-integration';

class Article extends Storable(Component) {
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
