import {callRouteByURL, RoutableComponent, assertIsRoutableClass} from '@layr/routable';
import {Navigator} from '@layr/navigator';
import {BrowserNavigator} from '@layr/browser-navigator';
import {formatError} from '@layr/utilities';
import React, {useRef, useState, useEffect, useContext} from 'react';

import {useForceUpdate} from './hooks';
import {BrowserNavigatorPlugin} from './plugins';

export function BrowserRootView({
  children,
  ...customization
}: {children: React.ReactNode} & Partial<Customization>) {
  const previousCustomization = useContext(CustomizationContext);

  if (previousCustomization !== undefined) {
    throw new Error("An application shouldn't have more than one RootView");
  }

  const actionView = useRef<BrowserActionView>(null);

  return (
    <CustomizationContext.Provider
      value={{
        dataPlaceholder: () => null,
        errorRenderer: (error) => {
          console.error(error);
          return <div>{formatError(error)}</div>;
        },
        actionWrapper: async (actionHandler, args) => {
          actionView.current!.open();
          try {
            return await actionHandler(...args);
          } finally {
            actionView.current!.close();
          }
        },
        errorNotifier: async (error) => {
          alert(formatError(error));
        },
        ...customization
      }}
    >
      <BrowserActionView ref={actionView} />
      {children}
    </CustomizationContext.Provider>
  );
}

export const NavigatorContext = React.createContext<Navigator | undefined>(undefined);

export function BrowserNavigatorView({rootComponent}: {rootComponent: RoutableComponent}) {
  assertIsRoutableClass(rootComponent);

  const navigatorRef = useRef<BrowserNavigator>();

  if (navigatorRef.current === undefined) {
    navigatorRef.current = new BrowserNavigator({plugins: [BrowserNavigatorPlugin()]});
    rootComponent.registerNavigator(navigatorRef.current);
  }

  const [isReady, setIsReady] = useState(false);

  const forceUpdate = useForceUpdate();

  useEffect(() => {
    navigatorRef.current!.addObserver(forceUpdate);

    setIsReady(true);

    return function () {
      navigatorRef.current!.removeObserver(forceUpdate);
      navigatorRef.current!.unmount();
    };
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <NavigatorContext.Provider value={navigatorRef.current}>
      {callRouteByURL(rootComponent, navigatorRef.current.getCurrentURL())}
    </NavigatorContext.Provider>
  );
}

export function useNavigator() {
  const navigator = useContext(NavigatorContext);

  if (navigator === undefined) {
    throw new Error(
      "Couldn't get a navigator. Please make sure you have included a NavigatorView at the top of your React component tree."
    );
  }

  return navigator;
}

export type Customization = {
  dataPlaceholder: () => JSX.Element | null;
  errorRenderer: (error: Error) => JSX.Element | null;
  actionWrapper: (actionHandler: (...args: any[]) => Promise<any>, args: any[]) => Promise<any>;
  errorNotifier: (error: Error) => Promise<void>;
};

export const CustomizationContext = React.createContext<Customization | undefined>(undefined);

export function useCustomization() {
  const customization = useContext(CustomizationContext);

  if (customization === undefined) {
    throw new Error(
      "Couldn't get the current customization. Please make sure you have included a RootView at the top of your React component tree."
    );
  }

  return customization;
}

export function Customizer({
  children,
  ...customization
}: Partial<Customization> & {children: React.ReactNode}) {
  const previousCustomization = useCustomization();

  return (
    <CustomizationContext.Provider value={{...previousCustomization, ...customization}}>
      {children}
    </CustomizationContext.Provider>
  );
}

export class BrowserActionView extends React.Component<
  {children?: React.ReactNode},
  {count: number; activeElement: Element | null}
> {
  state = {
    count: 0,
    activeElement: null
  };

  open() {
    this.setState(({count, activeElement}) => {
      count++;

      if (count === 1) {
        activeElement = document.activeElement;

        setTimeout(() => {
          if (typeof (activeElement as any)?.blur === 'function') {
            (activeElement as any).blur();
          }
        }, 0);
      }

      return {count, activeElement};
    });
  }

  close() {
    this.setState(({count, activeElement}) => {
      count--;

      if (count === 0) {
        const savedActiveElement = activeElement;

        setTimeout(() => {
          if (typeof (savedActiveElement as any)?.focus === 'function') {
            (savedActiveElement as any).focus();
          }
        }, 0);

        activeElement = null;
      }

      return {count, activeElement};
    });
  }

  render() {
    if (this.state.count === 0) {
      return null;
    }

    if (this.props.children !== undefined) {
      return this.props.children;
    }

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 30000
        }}
      />
    );
  }
}
