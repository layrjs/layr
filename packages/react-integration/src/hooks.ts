import type {Component} from '@liaison/component';
import {ObservableType, isObservable} from '@liaison/observable';
import {BrowserRouter} from '@liaison/browser-router';
import {useState, useEffect, useCallback, useRef, useMemo, DependencyList} from 'react';
import {AsyncFunction, getTypeOf} from 'core-helpers';

import {RouterPlugin} from './plugins';

/**
 * Creates a [`BrowserRouter`](https://liaison.dev/docs/v1/reference/browser-router) and registers the specified root [component](https://liaison.dev/docs/v1/reference/component).
 *
 * Typically, this hook is used in the context of a "view method" (i.e., a component method decorated by the [`@view()`](https://liaison.dev/docs/v1/reference/react-integration#view-decorator) decorator) at the root of an application.
 *
 * The created router is observed so the view where this hook is used is automatically re-rendered when the current route changes.
 *
 * @param rootComponent A [`Component`](https://liaison.dev/docs/v1/reference/component) class providing some [routable components](https://liaison.dev/docs/v1/reference/routable#routable-component-class).
 *
 * @returns An array of the shape `[router, isReady]` where `router` is the [`BrowserRouter`](https://liaison.dev/docs/v1/reference/browser-router) instance that was created and `isReady` is a boolean indicating whether the router is ready. Since the router is initialized asynchronously, make sure that the value of `isReady` is `true` before consuming `router`.
 *
 * @example
 * ```
 * import {Component, provide} from '﹫liaison/component';
 * import React from 'react';
 * import {view, useBrowserRouter} from '﹫liaison/react-integration';
 *
 * import {MyComponent} from './my-component';
 *
 * class Frontend extends Component {
 *   ﹫provide() static MyComponent = MyComponent; // A routable component
 *
 *   ﹫view() static View() {
 *     const [router, isReady] = useBrowserRouter(this);
 *
 *     if (!isReady) {
 *       return null;
 *     }
 *
 *     return (
 *       <div>
 *         <h1>My App</h1>
 *         {router.callCurrentRoute()}
 *       </div>
 *     );
 *   }
 * }
 * ```
 *
 * @category Hooks
 * @reacthook
 */
export function useBrowserRouter(rootComponent: typeof Component) {
  const router = useMemo(() => {
    const router = new BrowserRouter({plugins: [RouterPlugin()]});
    router.registerRootComponent(rootComponent);
    return router;
  }, [rootComponent]);

  const [isReady, setIsReady] = useState(false);

  const forceUpdate = useForceUpdate();

  useEffect(() => {
    router.addObserver(forceUpdate);

    setIsReady(true);

    return function () {
      router.removeObserver(forceUpdate);
      router.unmount();
    };
  }, [router]);

  return [router, isReady] as const;
}

/**
 * Makes a view dependent of an [observable](https://liaison.dev/docs/v1/reference/observable#observable-type) so the view is automatically re-rendered when the observable changes.
 *
 * @param observable An [observable](https://liaison.dev/docs/v1/reference/observable#observable-type) object.
 *
 * @example
 * ```
 * import {Component} from '﹫liaison/component';
 * import {createObservable} from '﹫liaison/observable';
 * import React from 'react';
 * import {view, useObserve} from '﹫liaison/react-integration';
 *
 * const observableArray = createObservable([]);
 *
 * class MyComponent extends Component {
 *   ﹫view() static View() {
 *     useObserve(observableArray);
 *
 *     return (
 *       <div>
 *         {`observableArray's length: ${observableArray.length}`}
 *       </div>
 *     );
 *   }
 * }
 *
 * // Changing `observableArray` will re-render `MyComponent.View()`
 * observableArray.push('abc');
 * ```
 *
 * @category Hooks
 * @reacthook
 */
export function useObserve(observable: ObservableType) {
  if (!isObservable(observable)) {
    throw new Error(
      `Expected an observable class or instance, but received a value of type '${getTypeOf(
        observable
      )}'`
    );
  }

  const forceUpdate = useForceUpdate();

  useEffect(
    function () {
      observable.addObserver(forceUpdate);

      return function () {
        observable.removeObserver(forceUpdate);
      };
    },
    [observable]
  );
}

/**
 * Allows you to define an asynchronous callback and keep track of its execution.
 *
 * Plays the same role as the React built-in [`useCallback()`](https://reactjs.org/docs/hooks-reference.html#usecallback) hook but for asynchronous callbacks.
 *
 * @param asyncCallback The asynchronous callback you want to track.
 *
 * @returns An array of the shape `[trackedCallback, isExecuting, error, result]` where `trackedCallback` is a function that you can call to execute the callback, `isExecuting` is a boolean indicating whether the callback is being executed, `error` is the error thrown by the callback in case of failed execution, and `result` is the value returned by the callback in case of succeeded execution.
 *
 * @example
 * ```
 * import {Component} from '﹫liaison/component';
 * import React from 'react';
 * import {view, useAsyncCallback} from '﹫liaison/react-integration';
 *
 * class Article extends Component {
 *   ﹫view() UpvoteButton() {
 *     const [handleUpvote, isUpvoting, upvotingError] = useAsyncCallback(async () => {
 *       await this.upvote();
 *     });
 *
 *     return (
 *       <div>
 *         <button onClick={handleUpvote} disabled={isUpvoting}>Upvote</button>
 *         {upvotingError && ' An error occurred while upvoting the article.'}
 *       </div>
 *     );
 *   }
 * }
 * ```
 *
 * @category Hooks
 * @reacthook
 */
export function useAsyncCallback<Args extends any[] = any[], Result = any>(
  callback: AsyncFunction<Args, Result>,
  deps: DependencyList
) {
  const [state, setState] = useState<{isExecuting?: boolean; error?: any; result?: Result}>({});

  const isMounted = useIsMounted();

  const trackedCallback = useCallback(
    async (...args: Args) => {
      setState({isExecuting: true});

      try {
        const result = await callback(...args);

        if (isMounted()) {
          setState({result});
        }

        return result;
      } catch (error) {
        if (isMounted()) {
          setState({error});
        }

        throw error;
      }
    },
    [...deps]
  );

  return [trackedCallback, state.isExecuting === true, state.error, state.result] as const;
}

/**
 * Allows you to get the result of an asynchronous function and keep track of its execution.
 *
 * The function is executed once when the React component is rendered for the first time.
 *
 * Plays the same role as the React built-in [`useMemo()`](https://reactjs.org/docs/hooks-reference.html#usememo) hook but for asynchronous function.
 *
 * @param asyncFunction The asynchronous function you want to track and memoize.
 *
 * @returns An array of the shape `[result, isExecuting, error, retry]` where `result` is the value returned by the function in case of succeeded execution, `isExecuting` is a boolean indicating whether the function is being executed, `error` is the error thrown by the function in case of failed execution, and `retry` is a function that you can call to retry the execution.
 *
 * @example
 * ```
 * import {Component} from '﹫liaison/component';
 * import React from 'react';
 * import {view, useAsyncMemo} from '﹫liaison/react-integration';
 *
 * class Article extends Component {
 *   // ...
 *
 *   ﹫view() static List() {
 *     const [articles, isLoading, loadingError, retryLoading] = useAsyncMemo(
 *       async () => {
 *         return await this.find();
 *       }
 *     );
 *
 *     if (isLoading) {
 *       return <div>Loading the articles...</div>;
 *     }
 *
 *     if (loadingError) {
 *       return (
 *         <div>
 *           An error occurred while loading the articles.
 *           <button onClick={retryLoading}>Retry</button>
 *         </div>
 *       );
 *     }
 *
 *     return articles.map((article) => (
 *       <div key={article.id}>{article.title}</div>
 *     ));
 *   }
 * }
 * ```
 *
 * @category Hooks
 * @reacthook
 */
export function useAsyncMemo<Result>(func: () => Promise<Result>, deps: DependencyList) {
  const [state, setState] = useState<{
    result?: Result;
    isExecuting?: boolean;
    error?: any;
  }>({isExecuting: true});

  const [retryCount, setRetryCount] = useState(0);

  const isMounted = useIsMounted();

  useEffect(() => {
    setState({isExecuting: true});

    func().then(
      (result) => {
        if (isMounted()) {
          setState({result});
        }

        return result;
      },
      (error) => {
        if (isMounted()) {
          setState({error});
        }

        throw error;
      }
    );
  }, [...deps, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((retryCount) => retryCount + 1);
  }, []);

  return [state.result, state.isExecuting === true, state.error, retry] as const;
}

/**
 * Allows you to call an asynchronous function and keep track of its execution.
 *
 * The function is executed once when the React component is rendered for the first time.
 *
 * @param asyncFunction The asynchronous function you want to call and track.
 *
 * @returns An array of the shape `[isExecuting, error, retry]` where `isExecuting` is a boolean indicating whether the function is being executed, `error` is the error thrown by the function in case of failed execution, and `retry` is a function that you can call to retry the execution.
 *
 * @example
 * ```
 * // JS
 *
 * import {Component, provide, attribute} from '﹫liaison/component';
 * import React from 'react';
 * import {view, useAsyncCall} from '﹫liaison/react-integration';
 *
 * class Article extends Component {
 *   // ...
 * }
 *
 * class Blog extends Component {
 *   ﹫provide() static Article = Article;
 *
 *   ﹫attribute('Article[]?') loadedArticles;
 *
 *   ﹫view() View() {
 *     const [isLoading, loadingError, retryLoading] = useAsyncCall(
 *       async () => {
 *         this.loadedArticles = await this.find();
 *       }
 *     );
 *
 *     if (isLoading) {
 *       return <div>Loading the articles...</div>;
 *     }
 *
 *     if (loadingError) {
 *       return (
 *         <div>
 *           An error occurred while loading the articles.
 *           <button onClick={retryLoading}>Retry</button>
 *         </div>
 *       );
 *     }
 *
 *     return this.loadedArticles.map((article) => (
 *       <div key={article.id}>{article.title}</div>
 *     ));
 *   }
 * }
 * ```
 *
 * @example
 * ```
 * // TS
 *
 * import {Component, provide, attribute} from '﹫liaison/component';
 * import React from 'react';
 * import {view, useAsyncCall} from '﹫liaison/react-integration';
 *
 * class Article extends Component {
 *   // ...
 * }
 *
 * class Blog extends Component {
 *   ﹫provide() static Article = Article;
 *
 *   ﹫attribute('Article[]?') loadedArticles?: Article[];
 *
 *   ﹫view() View() {
 *     const [isLoading, loadingError, retryLoading] = useAsyncCall(
 *       async () => {
 *         this.loadedArticles = await this.find();
 *       }
 *     );
 *
 *     if (isLoading) {
 *       return <div>Loading the articles...</div>;
 *     }
 *
 *     if (loadingError) {
 *       return (
 *         <div>
 *           An error occurred while loading the articles.
 *           <button onClick={retryLoading}>Retry</button>
 *         </div>
 *       );
 *     }
 *
 *     return this.loadedArticles!.map((article) => (
 *       <div key={article.id}>{article.title}</div>
 *     ));
 *   }
 * }
 * ```
 *
 * @category Hooks
 * @reacthook
 */
export function useAsyncCall(func: () => Promise<void>, deps: DependencyList) {
  const [, isExecuting, error, retry] = useAsyncMemo(func, deps);

  return [isExecuting, error, retry] as const;
}

export function useIsMounted() {
  const isMountedRef = useRef(false);

  const isMounted = useCallback(() => {
    return isMountedRef.current;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMounted;
}

export function useForceUpdate() {
  const [, setState] = useState({});
  const isMounted = useIsMounted();

  const forceUpdate = useCallback(() => {
    if (isMounted()) {
      setState({});
    }
  }, []);

  return forceUpdate;
}

export function useDelay(duration = 100) {
  const [isElapsed, setIsElapsed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsElapsed(true);
    }, duration);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return [isElapsed] as const;
}
