import {Component, consume} from '@liaison/component';
import {view, useDelay} from '@liaison/react-integration';
import {jsx, css} from '@emotion/core';
import {Fragment, useMemo} from 'react';
import useMetaTags from 'react-metatags-hook';

import {Home} from './home';
import {Blog} from './blog';
import {UI} from './ui';
// @ts-ignore
import liaisonLogo from '../assets/liaison-logo-dark-mode-20191111.immutable.svg';

const backendURL = process.env.BACKEND_URL;

if (!backendURL) {
  throw new Error(`'BACKEND_URL' environment variable is missing`);
}

export class Common extends Component {
  @consume() static Home: typeof Home;
  @consume() static Blog: typeof Blog;
  @consume() static UI: typeof UI;

  @view() static Layout({
    title,
    width = '650px',
    children
  }: {
    title?: string;
    width?: string;
    children: React.ReactNode;
  }) {
    const {UI} = this;

    this.useTitle(title);
    this.useRSSLink();

    return (
      <div>
        <UI.FullHeight css={{display: 'flex', flexDirection: 'column'}}>
          <this.Header />
          <div
            css={{
              flexGrow: 1,
              display: 'flex',
              padding: '1.5rem',
              justifyContent: 'center'
            }}
          >
            <div css={{flexBasis: width}}>{children}</div>
          </div>
          <this.Footer />
        </UI.FullHeight>
      </div>
    );
  }

  @view() static Header() {
    const {Home, Blog, UI} = this;

    const theme = UI.useTheme();

    const menuStyle = css({...UI.styles.unstyledList, ...UI.styles.noMargins});
    const menuItemStyle = css({...UI.styles.inlineBlock, marginLeft: '1.3rem'});

    return (
      <header
        css={{
          ...UI.styles.centeredPage,
          width: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '1.5rem 1.5rem 0 1.5rem'
        }}
      >
        <Home.Main.Link>
          <img src={liaisonLogo} alt="Liaison" css={{width: 80}} />
        </Home.Main.Link>
        <div css={{marginLeft: '0.6rem'}}>
          <small css={{color: theme.muted.textColor, letterSpacing: '0.04rem'}}>alpha</small>
        </div>

        <div css={{flexGrow: 1}} />

        <ul css={menuStyle}>
          <li css={menuItemStyle}>
            <a href="https://github.com/liaisonjs/liaison">Docs</a>
          </li>
          <li css={menuItemStyle}>
            <Blog.Main.Link>Blog</Blog.Main.Link>
          </li>
        </ul>
      </header>
    );
  }

  @view() static Footer() {
    const {Blog, UI} = this;

    const theme = UI.useTheme();

    const menuStyle = css({...UI.styles.unstyledList, ...UI.styles.noMargins});
    const menuItemStyle = css({marginBottom: '.5rem'});
    const columnGapStyle = css({width: '6rem'});

    return (
      <footer css={{padding: '3rem 0', backgroundColor: UI.colors.blueGrey800}}>
        <div css={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <ul css={menuStyle}>
            <li css={menuItemStyle}>
              <a href="https://github.com/liaisonjs/liaison">Docs</a>
            </li>
            <li css={menuItemStyle}>
              <Blog.Main.Link>Blog</Blog.Main.Link>
            </li>
            <li css={menuItemStyle}>
              <a href="mailto:hello@liaison.dev" target="_blank" rel="noopener noreferrer">
                Contact
              </a>
            </li>
          </ul>
          <div css={columnGapStyle}>&nbsp;</div>
          <ul css={menuStyle}>
            <li css={menuItemStyle}>
              <a href="https://github.com/liaisonjs/liaison">GitHub</a>
            </li>
            <li css={menuItemStyle}>
              <a href="https://twitter.com/liaisonjs" target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
            </li>
            <li css={menuItemStyle}>
              <a
                href="https://www.youtube.com/channel/UCa2ZQbL0tlSR97GelMdgm6g"
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube
              </a>
            </li>
          </ul>
        </div>
        <div css={{marginTop: '3rem', textAlign: 'center'}}>
          <small css={{color: theme.muted.textColor}}>
            Opensourced by{' '}
            <a
              href="https://1place.io/"
              target="_blank"
              rel="noopener noreferrer"
              css={{'color': theme.textColor, ':hover': {color: theme.highlighted.textColor}}}
            >
              1Place Inc.
            </a>
          </small>
        </div>
      </footer>
    );
  }

  @view() static RouteNotFound() {
    return <div>Sorry, there is nothing here.</div>;
  }

  @view() static LoadingSpinner() {
    const style = useMemo(
      () => ({
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        margin: '90px auto',
        position: 'relative' as const,
        borderTop: '3px solid rgba(0, 0, 0, 0.1)',
        borderRight: '3px solid rgba(0, 0, 0, 0.1)',
        borderBottom: '3px solid rgba(0, 0, 0, 0.1)',
        borderLeft: '3px solid #818a91',
        transform: 'translateZ(0)',
        animation: 'loading-spinner 0.5s infinite linear'
      }),
      []
    );

    return (
      <this.Delayed>
        <div className="loading-spinner" style={style}>
          <style>
            {`
          @keyframes loading-spinner {
            0% {transform: rotate(0deg);}
            100% {transform: rotate(360deg);}
          }
          `}
          </style>
        </div>
      </this.Delayed>
    );
  }

  @view() static ErrorMessage({
    error,
    onRetry
  }: {
    error?: {displayMessage?: string};
    onRetry?: Function;
  }) {
    const message = error?.displayMessage || 'Sorry, something went wrong.';

    return (
      <div role="alert">
        <div>{message}</div>
        {onRetry && (
          <Fragment>
            <hr />
            <div>
              <button onClick={() => onRetry()}>Retry</button>
            </div>
          </Fragment>
        )}
      </div>
    );
  }

  @view() static Scroller({id}: {id: string}) {
    const {UI} = this;

    const theme = UI.useTheme();

    return (
      <div css={{...UI.styles.minimumLineHeight, alignSelf: 'center', padding: '1.5rem 0'}}>
        <a
          href={`#${id}`}
          onClick={(event) => {
            const element = document.getElementById(id);
            if (element) {
              event.preventDefault();
              element.scrollIntoView({block: 'start', behavior: 'smooth'});
            }
          }}
          css={{
            'color': theme.muted.textColor,
            ':hover': {color: theme.textColor, textDecoration: 'none'}
          }}
        >
          ▼
        </a>
      </div>
    );
  }

  @view() static Delayed({
    duration = 400,
    children
  }: {
    duration?: number;
    children: React.ReactElement;
  }) {
    const [isElapsed] = useDelay(duration);

    if (isElapsed) {
      return children;
    }

    return null;
  }

  static useTitle(title?: string) {
    if (title === undefined) {
      title = 'Liaison';
    } else {
      title = 'Liaison – ' + title;
    }

    useMetaTags({title}, [title]);
  }

  static useRSSLink() {
    useMetaTags(
      {
        links: [
          {
            rel: 'alternate',
            type: 'application/rss+xml',
            title: 'Liaison Blog Feed',
            href: `${backendURL}/blog/feed`
          }
        ]
      },
      []
    );
  }
}
