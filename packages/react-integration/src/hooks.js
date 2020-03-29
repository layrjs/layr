import {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {BrowserRouter} from '@liaison/browser-router';
import {getTypeOf} from 'core-helpers';
import ow from 'ow';

import {RouterPlugin} from './plugins';

export function useBrowserRouter(routables) {
  const router = useMemo(
    () => new BrowserRouter(routables, {plugins: [RouterPlugin()]}),
    Array.isArray(routables) ? routables : [routables]
  );

  const [isReady, setIsReady] = useState(false);

  const forceUpdate = useForceUpdate();

  useEffect(() => {
    router.addObserver(forceUpdate);

    setIsReady(true);

    return function() {
      router.removeObserver(forceUpdate);
    };
  }, []);

  return [router, isReady];
}

export function useObserve(observable) {
  if (typeof observable?.isObservable !== 'function') {
    throw new Error(
      `Expected an observable class or instance, but received a value of type '${getTypeOf(
        observable
      )}'`
    );
  }

  const forceUpdate = useForceUpdate();

  useEffect(
    function() {
      observable.addObserver(forceUpdate);

      return function() {
        observable.removeObserver(forceUpdate);
      };
    },
    [observable]
  );
}

export function useAsyncCallback(callback, inputs) {
  ow(callback, 'callback', ow.function);
  ow(inputs, 'inputs', ow.array);

  const [state, setState] = useState({});
  const isMounted = useIsMounted();

  const trackedCallback = useCallback(
    async (...args) => {
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
    [...inputs]
  );

  return [trackedCallback, state.isExecuting === true, state.error, state.result];
}

export function useAsyncMemo(func, inputs) {
  ow(func, 'func', ow.function);
  ow(inputs, 'inputs', ow.array);

  const [state, setState] = useState({isExecuting: true});
  const [retryCount, setRetryCount] = useState(0);

  const isMounted = useIsMounted();

  useEffect(() => {
    setState({isExecuting: true});

    func().then(
      result => {
        if (isMounted()) {
          setState({result});
        }

        return result;
      },
      error => {
        if (isMounted()) {
          setState({error});
        }

        throw error;
      }
    );
  }, [...inputs, retryCount]);

  const retry = useCallback(() => {
    setRetryCount(retryCount => retryCount + 1);
  }, []);

  return [state.result, state.isExecuting === true, state.error, retry];
}

export function useAsyncCall(func, inputs) {
  ow(func, 'func', ow.function);
  ow(inputs, 'inputs', ow.array);

  const [, isExecuting, error, retry] = useAsyncMemo(func, inputs);

  return [isExecuting, error, retry];
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
  ow(duration, 'duration', ow.number);

  const [isElapsed, setIsElapsed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsElapsed(true);
    }, duration);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return [isElapsed];
}
