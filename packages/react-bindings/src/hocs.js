import React, {useRef, useCallback} from 'react';

import {useForceUpdate} from './hooks';

// TODO: Remove this false good idea
export function withAsyncComponent(Component) {
  function WithAsyncComponent(props, context) {
    const elementRef = useRef(null);
    const errorRef = useRef(undefined);
    const forceUpdateRef = useRef(undefined);

    const setElement = useCallback(element => {
      elementRef.current = element;
      if (forceUpdateRef.current !== undefined) {
        forceUpdateRef.current();
      }
    }, []);

    const setError = useCallback(error => {
      errorRef.current = error;
      if (forceUpdateRef.current !== undefined) {
        forceUpdateRef.current();
      }
    }, []);

    const SyncComponent = useCallback(() => {
      forceUpdateRef.current = useForceUpdate();

      if (errorRef.current !== undefined) {
        throw errorRef.current;
      }

      return elementRef.current;
    }, []);

    const element = Component.call(this, props, context);

    if (typeof element?.then === 'function') {
      element.then(setElement, setError);
    } else {
      setElement(element);
    }

    return <SyncComponent />;
  }

  return WithAsyncComponent;
}
