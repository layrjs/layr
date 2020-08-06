import type {Component} from '@liaison/component';
import {ObservableType, isObservable} from '@liaison/observable';
import {BrowserRouter} from '@liaison/browser-router';
import {useState, useEffect, useCallback, useRef, useMemo, DependencyList} from 'react';
import {SyncFunction, AsyncFunction, getTypeOf} from 'core-helpers';

import {RouterPlugin} from './plugins';

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
  ) as SyncFunction<Args, void>;

  return [trackedCallback, state.isExecuting === true, state.error, state.result] as const;
}

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
