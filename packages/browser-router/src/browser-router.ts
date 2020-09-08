import {Router, RouterOptions, normalizeURL, stringifyURL} from '@liaison/router';
import {PlainObject} from 'core-helpers';
import debounce from 'lodash/debounce';

declare global {
  interface Function {
    Link: (props: {params?: PlainObject; hash?: string} & PlainObject) => any;
  }
}

export type BrowserRouterLinkProps = {
  to: string;
  className?: string;
  activeClassName?: string;
  style?: React.CSSProperties;
  activeStyle?: React.CSSProperties;
};

export type BrowserRouterOptions = RouterOptions;

/**
 * *Inherits from [`Router`](https://liaison.dev/docs/v1/reference/router).*
 *
 * A [`Router`](https://liaison.dev/docs/v1/reference/router) relying on the browser's [History API](https://developer.mozilla.org/en-US/docs/Web/API/History) to determine the current [route](https://liaison.dev/docs/v1/reference/route).
 *
 * #### Usage
 *
 * If you are using [React](https://reactjs.org/), the easiest way to set up a `BrowserRouter` in your application is to use the [`useBrowserRouter()`](https://liaison.dev/docs/v1/reference/react-integration#use-browser-router-react-hook) hook that is provided by the `@liaison/react-integration` package.
 *
 * > See the ["Bringing Some Routes"](https://liaison.dev/docs/v1/introduction/routing) guide for a comprehensive example using the `useBrowserRouter()` hook.
 *
 * Otherwise, you can create a `BrowserRouter` instance manually, register some [routable components](https://liaison.dev/docs/v1/reference/routable#routable-component-class) into it, and observe it to automatically display the current route when the user navigates.
 *
 * **Example:**
 *
 * ```
 * import {Component} from '@liaison/component';
 * import {Routable, route} from '@liaison/routable';
 * import {BrowserRouter} from '@liaison/browser-router';
 *
 * class Frontend extends Routable(Component) {
 *   ﹫route('/') static Home() {
 *     // Return the content of the home page...
 *     return 'Home Page';
 *   }
 *
 *   ﹫route('/about') static About() {
 *     // Return the content of the about page...
 *     return 'About Page';
 *   }
 * }
 *
 * const router = new BrowserRouter();
 *
 * router.registerRoutable(Frontend);
 *
 * router.addObserver(() => {
 *   const result = router.callCurrentRoute();
 *   // Display the result in the browser...
 * });
 * ```
 */
export class BrowserRouter extends Router {
  /**
   * Creates a [`BrowserRouter`](https://liaison.dev/docs/v1/reference/browser-router).
   *
   * @returns The [`BrowserRouter`](https://liaison.dev/docs/v1/reference/browser-router) instance that was created.
   *
   * @category Creation
   */
  constructor(options: BrowserRouterOptions = {}) {
    super(options);
  }

  _popStateHandler!: (event: PopStateEvent) => void;
  _navigateHandler!: (event: Event) => void;
  _mutationObserver!: MutationObserver;
  _expectedHash: string | undefined;
  _scrollToHash!: () => void;

  mount() {
    // --- Back/forward navigation ---

    this._popStateHandler = () => {
      this.callObservers();
    };

    window.addEventListener('popstate', this._popStateHandler);

    this._navigateHandler = (event: Event) => {
      this.navigate((event as CustomEvent).detail.url);
    };

    // --- 'liaisonRouterNavigate' event ---

    document.body.addEventListener('liaisonRouterNavigate', this._navigateHandler);

    // --- Hash navigation fix ---

    this._scrollToHash = debounce(() => {
      const element = document.getElementById(this._expectedHash!);

      if (element !== null) {
        element.scrollIntoView({block: 'start', behavior: 'smooth'});
        this._expectedHash = undefined;
      }
    }, 50);

    this._mutationObserver = new MutationObserver(() => {
      if (this._expectedHash !== undefined) {
        this._scrollToHash();
      }
    });

    this._mutationObserver.observe(document.body, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true
    });

    this._fixScrollPosition();
  }

  unmount() {
    window.removeEventListener('popstate', this._popStateHandler);
    window.removeEventListener('popstate', this._navigateHandler);
    this._mutationObserver.disconnect();
  }

  // === Component Registration ===

  /**
   * See the methods that are inherited from the [`Router`](https://liaison.dev/docs/v1/reference/router#component-registration) class.
   *
   * @category Component Registration
   */

  // === Routes ===

  /**
   * See the methods that are inherited from the [`Router`](https://liaison.dev/docs/v1/reference/router#routes) class.
   *
   * @category Routes
   */

  // === Current Location ===

  /**
   * See the methods that are inherited from the [`Router`](https://liaison.dev/docs/v1/reference/router#current-location) class.
   *
   * @category Current Location
   */

  _getCurrentURL() {
    return normalizeURL(window.location.href);
  }

  // === Navigation ===

  /**
   * See the methods that are inherited from the [`Router`](https://liaison.dev/docs/v1/reference/router#navigation) class.
   *
   * @category Navigation
   */

  _navigate(url: URL) {
    window.history.pushState(null, '', stringifyURL(url));
    this._fixScrollPosition();
  }

  _redirect(url: URL) {
    window.history.replaceState(null, '', stringifyURL(url));
    this._fixScrollPosition();
  }

  _fixScrollPosition() {
    window.scrollTo(0, 0);

    const hash = this.getCurrentHash();

    if (hash !== undefined) {
      this._expectedHash = hash;
      this._scrollToHash();
    }
  }

  _reload(url: URL | undefined) {
    if (url !== undefined) {
      window.location.assign(stringifyURL(url));
    } else {
      window.location.reload();
    }
  }

  _go(delta: number) {
    window.history.go(delta);
  }

  _getHistoryLength() {
    return window.history.length;
  }

  /**
   * Renders a link that is managed by the router.
   *
   * This method is only available when you create your router by using the [`useBrowserRouter()`](https://liaison.dev/docs/v1/reference/react-integration#use-browser-router-react-hook) React hook.
   *
   * Note that instead of using this method, you can use the handy `Link()` shortcut function that you get when you define a route with the [`@route()`](https://liaison.dev/docs/v1/reference/routable#route-decorator) decorator.
   *
   * @param props.to A string representing the target URL of the link.
   * @param props.className A [`className`](https://reactjs.org/docs/dom-elements.html#classname) attribute to apply to the rendered link.
   * @param props.activeClassName An additional [`className`](https://reactjs.org/docs/dom-elements.html#classname) attribute to apply to the rendered link when the URL of the current router's route is the same as the target URL of the link.
   * @param props.style A [`style`](https://reactjs.org/docs/dom-elements.html#style) attribute to apply to the rendered link.
   * @param props.activeStyle An additional [`style`](https://reactjs.org/docs/dom-elements.html#style) attribute to apply to the rendered link when the URL of the current router's route is the same as the target URL of the link.
   *
   * @returns An `<a>` React element.
   *
   * @example
   * ```
   * class Frontend extends Routable(Component) {
   *    ﹫route('/') @view static Home() {
   *      const router = this.getRouter();
   *      return <router.Link to="/about-us">About Us</router.Link>;
   *
   *      // Same as above, but in a more idiomatic way:
   *      return <this.AboutUs.Link>About Us</this.AboutUs.Link>;
   *    }
   *
   *    ﹫route('/about-us') @view static AboutUs() {
   *      return <div>Here is everything about us.<div>;
   *    }
   * }
   * ```
   *
   * @category Link Rendering
   */
  Link!: (props: BrowserRouterLinkProps) => any;

  // === Observability ===

  /**
   * See the methods that are inherited from the [`Observable`](https://liaison.dev/docs/v1/reference/observable#observable-class) class.
   *
   * @category Observability
   */
}
