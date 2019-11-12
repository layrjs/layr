import {Registerable} from '@liaison/liaison';
import {view} from '@liaison/react-integration';
import {jsx, css} from '@emotion/core';

/** @jsx jsx */

export class Common extends Registerable() {
  @view() Header() {
    const {Home, ui} = this.$layer;

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
            <a href="https://github.com/liaisonjs/liaison/issues">Support</a>
          </li>
        </ul>
      </header>
    );
  }

  @view() Footer() {
    const {ui} = this.$layer;

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
              <a href="https://github.com/liaisonjs/liaison/issues">Support</a>
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
              css={{color: theme.textColor, ':hover': {color: theme.highlighted.textColor}}}
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
            color: theme.muted.textColor,
            ':hover': {color: theme.textColor, textDecoration: 'none'}
          }}
        >
          ▼
        </a>
      </div>
    );
  }
}
