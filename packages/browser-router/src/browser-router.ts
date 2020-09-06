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

export class BrowserRouter extends Router {
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

  _getCurrentURL() {
    return normalizeURL(window.location.href);
  }

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

  Link!: (props: BrowserRouterLinkProps) => any;
}
