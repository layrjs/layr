import {
  AbstractRouter,
  AbstractRouterOptions,
  normalizeURL,
  stringifyURL
} from '@liaison/abstract-router';
import {PlainObject} from 'core-helpers';

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

export type BrowserRouterOptions = AbstractRouterOptions;

export class BrowserRouter extends AbstractRouter {
  constructor(options: BrowserRouterOptions = {}) {
    super(options);

    window.addEventListener('popstate', () => {
      this.callObservers();
    });
  }

  _getCurrentURL() {
    return normalizeURL(window.location.href);
  }

  _navigate(url: URL) {
    window.history.pushState(null, '', stringifyURL(url));
  }

  _redirect(url: URL) {
    window.history.replaceState(null, '', stringifyURL(url));
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
