import {Navigator, NavigatorOptions, normalizeURL, stringifyURL} from '@layr/navigator';
import debounce from 'lodash/debounce';

export type BrowserNavigatorLinkProps = {
  to: string;
  className?: string;
  activeClassName?: string;
  style?: React.CSSProperties;
  activeStyle?: React.CSSProperties;
};

export type BrowserNavigatorOptions = NavigatorOptions;

/**
 * *Inherits from [`Navigator`](https://layrjs.com/docs/v2/reference/navigator).*
 *
 * A [`Navigator`](https://layrjs.com/docs/v2/reference/navigator) relying on the browser's [History API](https://developer.mozilla.org/en-US/docs/Web/API/History) to determine the current [route](https://layrjs.com/docs/v2/reference/route).
 *
 * #### Usage
 *
 * If you are using [React](https://reactjs.org/), the easiest way to set up a `BrowserNavigator` in your app is to use the [`BrowserNavigatorView`](https://layrjs.com/docs/v2/reference/react-integration#browser-navigator-view-react-component) React component that is provided by the `@layr/react-integration` package.
 *
 * See an example of use in the [`BrowserNavigatorView`](https://layrjs.com/docs/v2/reference/react-integration#browser-navigator-view-react-component) React component.
 */
export class BrowserNavigator extends Navigator {
  /**
   * Creates a [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator).
   *
   * @returns The [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) instance that was created.
   *
   * @category Creation
   */
  constructor(options: BrowserNavigatorOptions = {}) {
    super(options);
  }

  _popStateHandler!: (event: PopStateEvent) => void;
  _ignorePopStateHandler!: boolean;
  _navigateHandler!: (event: Event) => void;
  _mutationObserver!: MutationObserver;
  _expectedHash: string | undefined;
  _scrollToHash!: () => void;

  mount() {
    // --- Back/forward navigation ---

    this._popStateHandler = () => {
      if (!this._ignorePopStateHandler) {
        this.callObservers();
      }
    };

    this._ignorePopStateHandler = false;

    window.addEventListener('popstate', this._popStateHandler);

    this._navigateHandler = (event: Event) => {
      this.navigate((event as CustomEvent).detail.url);
    };

    // --- 'layrNavigatorNavigate' event ---

    document.body.addEventListener('layrNavigatorNavigate', this._navigateHandler);

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
   * See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#component-registration) class.
   *
   * @category Component Registration
   */

  // === Routes ===

  /**
   * See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#routes) class.
   *
   * @category Routes
   */

  // === Current Location ===

  /**
   * See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#current-location) class.
   *
   * @category Current Location
   */

  _getCurrentURL() {
    return normalizeURL(window.location.href);
  }

  // === Navigation ===

  /**
   * See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#navigation) class.
   *
   * @category Navigation
   */

  _navigate(url: URL) {
    window.history.pushState({index: this._getHistoryIndex() + 1}, '', stringifyURL(url));
    this._fixScrollPosition();
  }

  _redirect(url: URL) {
    window.history.replaceState({index: this._getHistoryIndex()}, '', stringifyURL(url));
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
      window.location.replace(stringifyURL(url));
    } else {
      window.location.reload();
    }
  }

  _go(delta: number) {
    return new Promise<void>((resolve) => {
      this._ignorePopStateHandler = true;

      window.addEventListener(
        'popstate',
        () => {
          this._ignorePopStateHandler = false;
          resolve();
        },
        {once: true}
      );

      window.history.go(delta);
    });
  }

  _getHistoryLength() {
    return window.history.length;
  }

  _getHistoryIndex() {
    return (window.history.state?.index ?? 0) as number;
  }

  /**
   * Renders a link that is managed by the navigator.
   *
   * This method is only available when you create your navigator by using the [`useBrowserNavigator()`](https://layrjs.com/docs/v2/reference/react-integration#use-browser-navigator-react-hook) React hook.
   *
   * Note that instead of using this method, you can use the handy `Link()` shortcut function that you get when you define a route with the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) decorator.
   *
   * @param props.to A string representing the target URL of the link.
   * @param props.className A [`className`](https://reactjs.org/docs/dom-elements.html#classname) attribute to apply to the rendered link.
   * @param props.activeClassName An additional [`className`](https://reactjs.org/docs/dom-elements.html#classname) attribute to apply to the rendered link when the URL of the current navigator's route is the same as the target URL of the link.
   * @param props.style A [`style`](https://reactjs.org/docs/dom-elements.html#style) attribute to apply to the rendered link.
   * @param props.activeStyle An additional [`style`](https://reactjs.org/docs/dom-elements.html#style) attribute to apply to the rendered link when the URL of the current navigator's route is the same as the target URL of the link.
   *
   * @returns An `<a>` React element.
   *
   * @example
   * ```
   * class Application extends Routable(Component) {
   *    ﹫route('/') @view static Home() {
   *      const navigator = this.getNavigator();
   *      return <navigator.Link to="/about-us">About Us</navigator.Link>;
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
  Link!: (props: BrowserNavigatorLinkProps) => any;

  // === Observability ===

  /**
   * See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.
   *
   * @category Observability
   */
}
