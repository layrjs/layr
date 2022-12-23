import {callRouteByURL, RoutableComponent, assertIsRoutableClass} from '@layr/routable';
import {Navigator} from '@layr/navigator';
import {BrowserNavigator} from '@layr/browser-navigator';
import {formatError} from '@layr/utilities';
import React, {useRef, useState, useEffect, useContext} from 'react';

import {useForceUpdate} from './hooks';
import {BrowserNavigatorPlugin} from './plugins';

/**
 * A React component providing sensible defaults for a web app.
 *
 * You should use this component once at the top of your app.
 *
 * Note that if you use [Boostr](https://boostr.dev/) to manage your app development, this component will be automatically mounted, so you don't have to use it explicitly in your code.
 *
 * The main point of this component is to provide the default behavior of high-level hooks such as [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) or [`useAction()`](https://layrjs.com/docs/v2/reference/react-integration#use-action-react-hook):
 *
 * - `useData()` will render `null` while the `getter()` function is running, and, in the case an error is thrown, a `<div>` containing an error message will be rendered.
 * - `useAction()` will prevent the user from interacting with any UI element in the browser page while the `handler()` function is running, and, in the case an error is thrown, the browser's `alert()` function will be called to display the error message.
 *
 * @examplelink See an example of use in the [`BrowserNavigatorView`](https://layrjs.com/docs/v2/reference/react-integration#browser-navigator-view-react-component) React component.
 *
 * @category React Components
 * @reactcomponent
 */
export function BrowserRootView({
  children,
  ...customization
}: {children: React.ReactNode} & Partial<Customization>) {
  const previousCustomization = useContext(CustomizationContext);

  if (previousCustomization !== undefined) {
    throw new Error("An app shouldn't have more than one RootView");
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

/**
 * A React component providing a [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator#browser-navigator-class) to your app.
 *
 * You should use this component once at the top of your app after the [`BrowserRootView`](https://layrjs.com/docs/v2/reference/react-integration#browser-root-view-react-component) component.
 *
 * Note that if you use [Boostr](https://boostr.dev/) to manage your app development, this component will be automatically mounted, so you don't have to use it explicitly in your code.
 *
 * @param props.rootComponent The root Layr component of your app. Note that this Layr component should be [`Routable`](https://layrjs.com/docs/v2/reference/routable#routable-component-class).
 *
 * @example
 * ```
 * // JS
 *
 * import React, {Fragment} from 'react';
 * import ReactDOM from 'react-dom';
 * import {Component} from '@layr/component';
 * import {Routable} from '@layr/routable';
 * import {BrowserRootView, BrowserNavigatorView, layout, page} from '@layr/react-integration';
 *
 * class Application extends Routable(Component) {
 *   // `@layout('/')` is a shortcut for `@wrapper('/') @view()`
 *   ﹫layout('/') static MainLayout({children}) {
 *     return (
 *       <>
 *         <this.HomePage.Link>
 *           <h1>My App</h1>
 *         </this.HomePage.Link>
 *
 *         {children()} // Renders the subcomponents using this layout
 *       </>
 *     );
 *   }
 *
 *   // `@page('[/]')` is a shortcut for `@route('[/]') @view()`
 *   ﹫page('[/]') static HomePage() {
 *     return <p>Hello, World!</p>;
 *   }
 * }
 *
 * // Note that you don't need the following code when you use Boostr
 * ReactDOM.render(
 *   <BrowserRootView>
 *     <BrowserNavigatorView rootComponent={Application} />
 *   </BrowserRootView>,
 *   // Your `index.html` page should contain `<div id="root"></div>`
 *   document.getElementById('root')
 * );
 * ```
 *
 * @example
 * ```
 * // TS
 *
 * import React, {Fragment} from 'react';
 * import ReactDOM from 'react-dom';
 * import {Component} from '@layr/component';
 * import {Routable} from '@layr/routable';
 * import {BrowserRootView, BrowserNavigatorView, layout, page} from '@layr/react-integration';
 *
 * class Application extends Routable(Component) {
 *   // `@layout('/')` is a shortcut for `@wrapper('/') @view()`
 *   ﹫layout('/') static MainLayout({children}: {children: () => any}) {
 *     return (
 *       <>
 *         <this.HomePage.Link>
 *           <h1>My App</h1>
 *         </this.HomePage.Link>
 *
 *         {children()} // Renders the subcomponents using this layout
 *       </>
 *     );
 *   }
 *
 *   // `@page('[/]')` is a shortcut for `@route('[/]') @view()`
 *   ﹫page('[/]') static HomePage() {
 *     return <p>Hello, World!</p>;
 *   }
 * }
 *
 * // Note that you don't need the following code when you use Boostr
 * ReactDOM.render(
 *   <BrowserRootView>
 *     <BrowserNavigatorView rootComponent={Application} />
 *   </BrowserRootView>,
 *   // Your `index.html` page should contain `<div id="root"></div>`
 *   document.getElementById('root')
 * );
 * ```
 *
 * @category React Components
 * @reactcomponent
 */
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

/**
 * A hook allowing you to get the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#navigator-class) used in your app.
 *
 * @returns A [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#navigator-class) instance.
 *
 * @example
 * ```
 * import {Component} from '﹫layr/component';
 * import {Routable} from '﹫layr/routable';
 * import React from 'react';
 * import {view, useNavigator} from '﹫layr/react-integration';
 *
 * import logo from '../assets/app-logo.svg';
 *
 * class Application extends Routable(Component) {
 *   // ...
 *
 *   ﹫view() static LogoView() {
 *     const navigator = useNavigator();
 *
 *     return <img src={logo} onClick={() => { navigator.navigate('/); }} />;
 *   }
 * }
 * ```
 *
 * @category High-Level Hooks
 * @reacthook
 */
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

/**
 * A React component allowing you to customize the behavior of high-level hooks such as [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) or [`useAction()`](https://layrjs.com/docs/v2/reference/react-integration#use-action-react-hook).
 *
 * @param [props.dataPlaceholder] A function returning a React element (or `null`) that is rendered while the `getter()` function of the [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) hook is running. A typical use case is to render a spinner.
 * @param [props.errorRenderer] A function returning a React element (or `null`) that is rendered when the `getter()` function of the [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) hook throws an error. The `errorRenderer()` function receives the error as first parameter. A typical use case is to render an error message.
 * @param [props.actionWrapper] An asynchronous function allowing you to wrap the `handler()` function of the [`useAction()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) hook. The `actionWrapper()` function receives the `handler()` function as first parameter, should execute it, and return its result. A typical use case is to lock the screen while the `handler()` function is running so the user cannot interact with any UI element.
 * @param [props.errorNotifier] An asynchronous function that is executed when the `handler()` function of the [`useAction()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) hook throws an error. The `errorNotifier()` function receives the error as first parameter. A typical use case is to display an error alert dialog.
 *
 * @example
 * ```
 * <Customizer
 *   dataPlaceholder={() => {
 *     // Renders a custom `LoadingSpinner` component
 *     return <LoadingSpinner />;
 *   }}
 *   errorRenderer={(error) => {
 *     // Renders a custom `ErrorMessage` component
 *     return <ErrorMessage>{error}</ErrorMessage>;
 *   }}
 *   actionWrapper={async (actionHandler, args) => {
 *     // Do whatever you want here (e.g., custom screen locking)
 *     try {
 *       return await actionHandler(...args);
 *     } finally {
 *       // Do whatever you want here (e.g., custom screen unlocking)
 *     }
 *   }}
 *   errorNotifier={async (error) => {
 *     // Calls a custom `alert()` asynchronous function
 *     await alert(error.message);
 *   }}
 * >
 *   <YourChildComponent />
 * </Customizer>
 * ```
 *
 * @category React Components
 * @reactcomponent
 */
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
