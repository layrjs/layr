import {Registerable} from '@liaison/liaison';
import {view, useDelay} from '@liaison/react-integration';
import {jsx, css} from '@emotion/core';
import {useMemo} from 'react';
import useMetaTags from 'react-metatags-hook';

/** @jsx jsx */

export class Common extends Registerable() {
  @view() Layout({title, width = '650px', children}) {
    const {ui} = this.$layer;

    this.useTitle(title);

    return (
      <div>
        <ui.FullHeight css={{display: 'flex', flexDirection: 'column'}}>
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
        </ui.FullHeight>
      </div>
    );
  }

  @view() Header() {
    const {Home, Blog, ui} = this.$layer;

    const theme = ui.useTheme();

    const menuStyle = css({...ui.styles.unstyledList, ...ui.styles.noMargins});
    const menuItemStyle = css({...ui.styles.inlineBlock, marginLeft: '1.3rem'});

    return (
      <header
        css={{
          ...ui.styles.centeredPage,
          width: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '1.5rem 1.5rem 0 1.5rem'
        }}
      >
        <Home.Main.Link>
          <img
            src="/assets/liaison-logo-dark-mode-20191111.immutable.svg"
            alt="Liaison"
            css={{width: 80}}
          />
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

  @view() Footer() {
    const {Blog, ui} = this.$layer;

    const theme = ui.useTheme();

    const menuStyle = css({...ui.styles.unstyledList, ...ui.styles.noMargins});
    const menuItemStyle = css({marginBottom: '.5rem'});
    const columnGapStyle = css({width: '6rem'});

    return (
      <footer css={{padding: '3rem 0', backgroundColor: ui.colors.blueGrey800}}>
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

  @view() RouteNotFound() {
    return <div>Sorry, there is nothing here.</div>;
  }

  @view() LoadingSpinner() {
    const style = useMemo(
      () => ({
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        margin: '90px auto',
        position: 'relative',
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

  @view() ErrorMessage({error, onRetry}) {
    const message = error?.displayMessage || 'Sorry, something went wrong.';

    return (
      <div role="alert">
        <div>{message}</div>
        {onRetry && (
          <>
            <hr />
            <div>
              <button onClick={onRetry}>Retry</button>
            </div>
          </>
        )}
      </div>
    );
  }

  @view() Scroller({id}) {
    const {ui} = this.$layer;

    const theme = ui.useTheme();

    return (
      <div css={{...ui.styles.minimumLineHeight, alignSelf: 'center', padding: '1.5rem 0'}}>
        <a
          href={`#${id}`}
          onClick={event => {
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

  @view() Delayed({duration = 400, children}) {
    const [isElapsed] = useDelay(duration);

    if (isElapsed) {
      return children;
    }

    return null;
  }

  useTitle(title) {
    if (title === undefined) {
      title = 'Liaison';
    } else {
      title = 'Liaison – ' + title;
    }

    useMetaTags({title});
  }
}
