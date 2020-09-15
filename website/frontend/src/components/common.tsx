import {Component, consume} from '@liaison/component';
import {view, useDelay} from '@liaison/react-integration';
import {jsx, css} from '@emotion/core';
import {Fragment, useMemo, useState} from 'react';
import useMetaTags from 'react-metatags-hook';

import type {Home} from './home';
import type {Docs} from './docs';
import type {Blog} from './blog';
import type {UI} from './ui';
// @ts-ignore
import liaisonLogo from '../assets/liaison-logo-dark-mode-20191111.immutable.svg';
// @ts-ignore
import brokenHeart from '../assets/broken-heart-20200822.immutable.svg';
// @ts-ignore
import love from '../assets/f-plus-b-equals-love-20191111.immutable.svg';

export class Common extends Component {
  @consume() static Home: typeof Home;
  @consume() static Docs: typeof Docs;
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

    return (
      <div>
        <UI.FullHeight css={{display: 'flex', flexDirection: 'column'}}>
          <this.Header />
          <div
            css={UI.responsive({
              flexGrow: 1,
              display: 'flex',
              padding: ['1.5rem', , '1.5rem 15px'],
              justifyContent: 'center'
            })}
          >
            <div css={{flexBasis: width}}>{children}</div>
          </div>
          <this.Footer />
        </UI.FullHeight>
      </div>
    );
  }

  @view() static Header() {
    const {Home, Docs, Blog, UI} = this;

    const theme = UI.useTheme();

    const menuStyle = {...UI.styles.unstyledList, ...UI.styles.noMargins};
    const menuItemStyle = {...UI.styles.inlineBlock, ...UI.styles.noMargins, marginLeft: '1.3rem'};

    return (
      <header
        css={UI.responsive({
          ...UI.styles.centeredPage,
          width: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          padding: ['1.5rem 1.5rem 0 1.5rem', , '1.5rem 15px 0 15px']
        })}
      >
        <Home.Main.Link>
          <img src={liaisonLogo} alt="Liaison" css={{width: 80}} />
        </Home.Main.Link>
        <div css={{marginLeft: '0.6rem'}}>
          <small css={{color: theme.muted.textColor, letterSpacing: '0.04rem'}}>alpha</small>
        </div>

        <div css={{flexGrow: 1}} />

        <nav>
          <ul css={menuStyle}>
            <li css={menuItemStyle}>
              <Docs.Main.Link>Docs</Docs.Main.Link>
            </li>
            <li css={menuItemStyle}>
              <Blog.Main.Link>Blog</Blog.Main.Link>
            </li>
            <li css={UI.responsive({...menuItemStyle, display: ['inline-block', , , 'none']})}>
              <a
                href="https://github.com/liaisonjs/liaison"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </li>
          </ul>
        </nav>
      </header>
    );
  }

  @view() static Footer() {
    const {Docs, Blog, UI} = this;

    const menuStyle = css({...UI.styles.unstyledList, ...UI.styles.noMargins});
    const menuItemStyle = css({marginBottom: '.5rem'});
    const columnGapStyle = css({width: '6rem'});

    return (
      <footer css={{padding: '3rem 0 2rem 0', backgroundColor: UI.colors.blueGrey800}}>
        <div css={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <ul css={menuStyle}>
            <li css={menuItemStyle}>
              <Docs.Main.Link>Docs</Docs.Main.Link>
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
              <a
                href="https://github.com/liaisonjs/liaison"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
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

        <this.FrontendPlusBackendEqualsLove />
      </footer>
    );
  }

  @view() static FrontendPlusBackendEqualsLove() {
    const {UI} = this;

    const theme = UI.useTheme();

    const [textMode, setTextMode] = useState(false);

    return (
      <div
        onClick={() => {
          setTextMode(!textMode);
        }}
        css={{
          marginTop: '3rem',
          height: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        {!textMode ? (
          <img
            src={love}
            alt="Frontend + Backend = Love"
            title="Frontend + Backend = Love"
            css={{width: 80}}
          />
        ) : (
          <div css={{}}>
            <small style={{color: theme.primaryColor}}>Frontend</small>
            <small style={{color: theme.muted.textColor}}> + </small>
            <small style={{color: theme.secondaryColor}}>Backend</small>
            <small style={{color: theme.muted.textColor}}> = </small>
            <small style={{color: theme.tertiaryColor}}>Love</small>
          </div>
        )}
      </div>
    );
  }

  @view() static RouteNotFound() {
    return (
      <div
        css={{
          width: '100%',
          padding: '6rem 15px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <img src={brokenHeart} alt="Liaison" css={{width: 150}} />
        <div css={{marginTop: '2rem'}}>Sorry, there is nothing here.</div>
      </div>
    );
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
    duration = 750,
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
}
