import {useState, useEffect, useCallback, useRef} from 'react';

export function useModel(model) {
  const forceUpdate = useForceUpdate();

  useEffect(
    function () {
      let deferredForceUpdate = false;
      const deferForceUpdate = function () {
        if (!deferredForceUpdate) {
          deferredForceUpdate = true;
          setTimeout(function () {
            deferredForceUpdate = false;
            forceUpdate();
          }, 10);
        }
      };

      model.observe(deferForceUpdate);

      return function () {
        model.unobserve(deferForceUpdate);
      };
    },
    [model]
  );
}

export function useAsyncCallback(callback, inputs) {
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

  return [isElapsed];
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
