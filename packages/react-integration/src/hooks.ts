import type {Component} from '@layr/component';
import {ObservableType, isObservable} from '@layr/observable';
import {BrowserRouter} from '@layr/browser-router';
import {MemoryRouter, MemoryRouterOptions} from '@layr/memory-router';
import React, {useState, useEffect, useCallback, useRef, useMemo, DependencyList} from 'react';
import {AsyncFunction, getTypeOf} from 'core-helpers';

import {BrowserRouterPlugin} from './plugins';
import {useCustomization} from './components';

/**
 * Creates a [`BrowserRouter`](https://layrjs.com/docs/v1/reference/browser-router) and registers the specified root [component](https://layrjs.com/docs/v1/reference/component).
 *
 * Typically, this hook is used in the context of a "view method" (i.e., a component method decorated by the [`@view()`](https://layrjs.com/docs/v1/reference/react-integration#view-decorator) decorator) at the root of an application.
 *
 * The created router is observed so the view where this hook is used is automatically re-rendered when the current route changes.
 *
 * @param rootComponent A [`Component`](https://layrjs.com/docs/v1/reference/component) class providing some [routable components](https://layrjs.com/docs/v1/reference/routable#routable-component-class).
 *
 * @returns An array of the shape `[router, isReady]` where `router` is the [`BrowserRouter`](https://layrjs.com/docs/v1/reference/browser-router) instance that was created and `isReady` is a boolean indicating whether the router is ready. Since the router is initialized asynchronously, make sure that the value of `isReady` is `true` before consuming `router`.
 *
 * @example
 * ```
 * import {Component, provide} from '﹫layr/component';
 * import React from 'react';
 * import {view, useBrowserRouter} from '﹫layr/react-integration';
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
    const router = new BrowserRouter({plugins: [BrowserRouterPlugin()]});
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
 * Creates a [`MemoryRouter`](https://layrjs.com/docs/v1/reference/memory-router) and registers the specified root [component](https://layrjs.com/docs/v1/reference/component).
 *
 * Typically, this hook is used in the context of a "view method" (i.e., a component method decorated by the [`@view()`](https://layrjs.com/docs/v1/reference/react-integration#view-decorator) decorator) at the root of an application.
 *
 * The created router is observed so the view where this hook is used is automatically re-rendered when the current route changes.
 *
 * @param rootComponent A [`Component`](https://layrjs.com/docs/v1/reference/component) class providing some [routable components](https://layrjs.com/docs/v1/reference/routable#routable-component-class).
 * @param [options.initialURLs] An array of URLs to populate the initial navigation history (default: `[]`).
 * @param [options.initialIndex] A number specifying the current entry's index in the navigation history (default: the index of the last entry in the navigation history).
 *
 * @returns An array of the shape `[router]` where `router` is the [`MemoryRouter`](https://layrjs.com/docs/v1/reference/memory-router) instance that was created.
 *
 * @example
 * ```
 * import {Component, provide} from '﹫layr/component';
 * import React from 'react';
 * import {view, useMemoryRouter} from '﹫layr/react-integration';
 *
 * import {MyComponent} from './my-component';
 *
 * class Frontend extends Component {
 *   ﹫provide() static MyComponent = MyComponent; // A routable component
 *
 *   ﹫view() static View() {
 *     const [router] = useMemoryRouter(this, {initialURLs: ['/']});
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
export function useMemoryRouter(
  rootComponent: typeof Component,
  options: MemoryRouterOptions = {}
) {
  const router = useMemo(() => {
    const router = new MemoryRouter(options);
    router.registerRootComponent(rootComponent);
    return router;
  }, [rootComponent]);

  const forceUpdate = useForceUpdate();

  useEffect(() => {
    router.addObserver(forceUpdate);

    return function () {
      router.removeObserver(forceUpdate);
      router.unmount();
    };
  }, [router]);

  return [router] as const;
}

export function useData<Result>(
  getter: () => Promise<Result>,
  renderer: (data: Result) => JSX.Element | null,
  deps: DependencyList = []
) {
  const {dataPlaceholder, errorRenderer} = useCustomization();

  const [element, isExecuting, error] = useAsyncMemo(async () => {
    const data = await getter();

    const element = React.createElement(function ActualView() {
      return renderer(data);
    });

    return element;
  }, deps);

  if (isExecuting) {
    return dataPlaceholder();
  }

  if (error) {
    return errorRenderer(error);
  }

  return element!;
}

export function useAction<Args extends any[] = any[], Result = any>(
  handler: AsyncFunction<Args, Result>,
  deps: DependencyList = []
) {
  const {actionWrapper, errorNotifier} = useCustomization();

  const action = useCallback(async (...args: Args) => {
    try {
      return (await actionWrapper(handler as (...args: any[]) => Promise<any>, args)) as Result;
    } catch (error) {
      await errorNotifier(error);
      throw error;
    }
  }, deps);

  return action;
}

/**
 * Makes a view dependent of an [observable](https://layrjs.com/docs/v1/reference/observable#observable-type) so the view is automatically re-rendered when the observable changes.
 *
 * @param observable An [observable](https://layrjs.com/docs/v1/reference/observable#observable-type) object.
 *
 * @example
 * ```
 * import {Component} from '﹫layr/component';
 * import {createObservable} from '﹫layr/observable';
 * import React from 'react';
 * import {view, useObserve} from '﹫layr/react-integration';
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
 * Plays the same role as the React built-in [`useCallback()`](https://reactjs.org/docs/hooks-reference.html#usecallback) hook but works with asynchronous callbacks.
 *
 * @param asyncCallback An asynchronous callback.
 * @param dependencies An array of values on which the asynchronous callback depends (default: `[]`).
 *
 * @returns An array of the shape `[trackedCallback, isExecuting, error, result]` where `trackedCallback` is a function that you can call to execute the asynchronous callback, `isExecuting` is a boolean indicating whether the asynchronous callback is being executed, `error` is the error thrown by the asynchronous callback in case of failed execution, and `result` is the value returned by the asynchronous callback in case of succeeded execution.
 *
 * @example
 * ```
 * import {Component} from '﹫layr/component';
 * import React from 'react';
 * import {view, useAsyncCallback} from '﹫layr/react-integration';
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
  asyncCallback: AsyncFunction<Args, Result>,
  deps: DependencyList = []
) {
  const [state, setState] = useState<{isExecuting?: boolean; error?: any; result?: Result}>({});

  const isMounted = useIsMounted();

  const trackedCallback = useCallback(
    async (...args: Args) => {
      setState({isExecuting: true});

      try {
        const result = await asyncCallback(...args);

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
 * Memoizes the result of an asynchronous function execution and provides a "recompute function" that you can call to recompute the memoized result.
 *
 * The asynchronous function is executed one time when the React component is rendered for the first time, and each time a dependency is changed or the "recompute function" is called.
 *
 * Plays the same role as the React built-in [`useMemo()`](https://reactjs.org/docs/hooks-reference.html#usememo) hook but works with asynchronous functions and allows to recompute the memoized result.
 *
 * @param asyncFunc An asynchronous function to compute the memoized result.
 * @param dependencies An array of values on which the memoized result depends (default: `[]`, which means that the memoized result will be recomputed only when the "recompute function" is called).
 *
 * @returns An array of the shape `[memoizedResult, isExecuting, error, recompute]` where `memoizedResult` is the result returned by the asynchronous function in case of succeeded execution, `isExecuting` is a boolean indicating whether the asynchronous function is being executed, `error` is the error thrown by the asynchronous function in case of failed execution, and `recompute` is a function that you can call to recompute the memoized result.
 *
 * @example
 * ```
 * import {Component} from '﹫layr/component';
 * import {Storable} from '﹫layr/storable';
 * import React from 'react';
 * import {view, useAsyncMemo} from '﹫layr/react-integration';
 *
 * class Article extends Storable(Component) {
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
export function useAsyncMemo<Result>(asyncFunc: () => Promise<Result>, deps: DependencyList = []) {
  const [state, setState] = useState<{
    result?: Result;
    isExecuting?: boolean;
    error?: any;
  }>({isExecuting: true});

  const [recomputeCount, setRecomputeCount] = useState(0);

  const isMounted = useIsMounted();

  useEffect(() => {
    setState({isExecuting: true});

    asyncFunc().then(
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
  }, [...deps, recomputeCount]);

  const recompute = useCallback(() => {
    setState({isExecuting: true});
    setRecomputeCount((recomputeCount) => recomputeCount + 1);
  }, []);

  return [state.result, state.isExecuting === true, state.error, recompute] as const;
}

/**
 * Memoizes the result of a function execution and provides a "recompute function" that you can call to recompute the memoized result.
 *
 * The function is executed one time when the React component is rendered for the first time, and each time a dependency is changed or the "recompute function" is called.
 *
 * Plays the same role as the React built-in [`useMemo()`](https://reactjs.org/docs/hooks-reference.html#usememo) hook but with the extra ability to recompute the memoized result.
 *
 * @param func A function to compute the memoized result.
 * @param dependencies An array of values on which the memoized result depends (default: `[]`, which means that the memoized result will be recomputed only when the "recompute function" is called).
 *
 * @returns An array of the shape `[memoizedResult, recompute]` where `memoizedResult` is the result of the function execution, and `recompute` is a function that you can call to recompute the memoized result.
 *
 * @example
 * ```
 * import {Component, provide} from '﹫layr/component';
 * import {Storable} from '﹫layr/storable';
 * import React, {useCallback} from 'react';
 * import {view, useRecomputableMemo} from '﹫layr/react-integration';
 *
 * class Article extends Storable(Component) {
 *   // ...
 * }
 *
 * class Blog extends Component {
 *   ﹫provide() static Article = Article;
 *
 *   ﹫view() static ArticleCreator() {
 *     const [article, resetArticle] = useRecomputableMemo(() => new Article());
 *
 *     const createArticle = useCallback(async () => {
 *       await article.save();
 *       resetArticle();
 *     }, [article]);
 *
 *     return (
 *       <div>
 *         <article.CreateForm onSubmit={createArticle} />
 *       </div>
 *     );
 *   }
 * }
 * ```
 *
 * @category Hooks
 * @reacthook
 */
export function useRecomputableMemo<Result>(func: () => Result, deps: DependencyList = []) {
  const [recomputeCount, setRecomputeCount] = useState(0);

  const result = useMemo(func, [...deps, recomputeCount]);

  const recompute = useCallback(() => {
    setRecomputeCount((recomputeCount) => recomputeCount + 1);
  }, []);

  return [result, recompute] as const;
}

/**
 * Allows you to call an asynchronous function and keep track of its execution.
 *
 * The function is executed one time when the React component is rendered for the first time, and each time a dependency is changed or the "recall function" is called.
 *
 * @param asyncFunc The asynchronous function to call.
 * @param dependencies An array of values on which the asynchronous function depends (default: `[]`, which means that the asynchronous will be recalled only when the "recall function" is called).
 *
 * @returns An array of the shape `[isExecuting, error, recall]` where `isExecuting` is a boolean indicating whether the asynchronous function is being executed, `error` is the error thrown by the asynchronous function in case of failed execution, and `recall` is a function that you can call to recall the asynchronous function.
 *
 * @example
 * ```
 * // JS
 *
 * import {Component, provide, attribute} from '﹫layr/component';
 * import {Storable} from '﹫layr/storable';
 * import React from 'react';
 * import {view, useAsyncCall} from '﹫layr/react-integration';
 *
 * class Article extends Storable(Component) {
 *   // ...
 * }
 *
 * class Blog extends Component {
 *   ﹫provide() static Article = Article;
 *
 *   ﹫attribute('Article[]?') static loadedArticles;
 *
 *   ﹫view() static View() {
 *     const [isLoading, loadingError, retryLoading] = useAsyncCall(
 *       async () => {
 *         this.loadedArticles = await this.Article.find();
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
 * import {Component, provide, attribute} from '﹫layr/component';
 * import {Storable} from '﹫layr/storable';
 * import React from 'react';
 * import {view, useAsyncCall} from '﹫layr/react-integration';
 *
 * class Article extends Storable(Component) {
 *   // ...
 * }
 *
 * class Blog extends Component {
 *   ﹫provide() static Article = Article;
 *
 *   ﹫attribute('Article[]?') static loadedArticles?: Article[];
 *
 *   ﹫view() static View() {
 *     const [isLoading, loadingError, retryLoading] = useAsyncCall(
 *       async () => {
 *         this.loadedArticles = await this.Article.find();
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
export function useAsyncCall(asyncFunc: () => Promise<void>, deps: DependencyList = []) {
  const [, isExecuting, error, recall] = useAsyncMemo(asyncFunc, deps);

  return [isExecuting, error, recall] as const;
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
