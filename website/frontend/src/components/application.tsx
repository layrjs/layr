import {provide} from '@layr/component';
import {Routable} from '@layr/routable';
import {useState} from 'react';
import {jsx, css} from '@emotion/core';
import {layout, page, view, useBrowserRouter} from '@layr/react-integration';

import type {Application as BackendApplication} from '../../../backend/src/components/application';
import {Home} from './home';
import {Docs} from './docs';
import {createSessionComponent} from './session';
import {createUserComponent} from './user';
import {Blog} from './blog';
import {creteArticleComponent} from './article';
import {createNewsletterComponent} from './newsletter';
import {UI} from './ui';
// @ts-ignore
import layrLogo from '../assets/layr-logo-with-icon-dark-mode-20201027.immutable.svg';
// @ts-ignore
import brokenHeart from '../assets/broken-heart-20200822.immutable.svg';
// @ts-ignore
import love from '../assets/f-plus-b-equals-love-20191111.immutable.svg';

export const createApplicationComponent = (Base: typeof BackendApplication) => {
  class Application extends Routable(Base) {
    @provide() static Home = Home;
    @provide() static Docs = Docs;
    @provide() static Session = createSessionComponent(Base.Session);
    @provide() static User = createUserComponent(Base.User);
    @provide() static Blog = Blog;
    @provide() static Article = creteArticleComponent(Base.Article);
    @provide() static Newsletter = createNewsletterComponent(Base.Newsletter);
    @provide() static UI = UI;

    @layout('/') static MainLayout({children}: {children: () => any}) {
      const {UI} = this;

      return (
        <div>
          <UI.FullHeight css={{display: 'flex', flexDirection: 'column'}}>
            <this.HeaderView />
            <div
              css={UI.responsive({
                flexGrow: 1,
                display: 'flex',
                padding: ['1.5rem', , '1.5rem 15px'],
                justifyContent: 'center'
              })}
            >
              {children()}
            </div>
            <this.FooterView />
          </UI.FullHeight>
        </div>
      );
    }

    @view() static HeaderView() {
      const {Home, Docs, Blog, UI} = this;

      const theme = UI.useTheme();

      const menuStyle = {...UI.styles.unstyledList, ...UI.styles.noMargins};
      const menuItemStyle = {
        ...UI.styles.inlineBlock,
        ...UI.styles.noMargins,
        marginLeft: '1.3rem'
      };

      return (
        <header
          css={UI.responsive({
            ...UI.styles.centeredPage,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: ['1rem 1.5rem 0 1.5rem', , '1rem 15px 0 15px']
          })}
        >
          <Home.MainPage.Link>
            <img src={layrLogo} alt="Layr" css={{width: 75}} />
          </Home.MainPage.Link>
          <div css={{marginLeft: '0.6rem'}}>
            <small css={{color: theme.muted.textColor, letterSpacing: '0.04rem'}}>v1</small>
          </div>

          <nav css={{marginLeft: 'auto'}}>
            <ul css={menuStyle}>
              <li css={menuItemStyle}>
                <Docs.MainPage.Link>Docs</Docs.MainPage.Link>
              </li>
              <li css={menuItemStyle}>
                <Blog.MainPage.Link>Blog</Blog.MainPage.Link>
              </li>
              <li css={UI.responsive({...menuItemStyle, display: ['inline-block', , , 'none']})}>
                <a href="https://github.com/layrjs/layr" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
        </header>
      );
    }

    @view() static FooterView() {
      const {Docs, Blog, UI} = this;

      const menuStyle = css({...UI.styles.unstyledList, ...UI.styles.noMargins});
      const menuItemStyle = css({marginBottom: '.5rem'});
      const columnGapStyle = css({width: '6rem'});

      return (
        <footer css={{padding: '3rem 0 2rem 0', backgroundColor: UI.colors.blueGrey800}}>
          <div css={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <ul css={menuStyle}>
              <li css={menuItemStyle}>
                <Docs.MainPage.Link>Docs</Docs.MainPage.Link>
              </li>
              <li css={menuItemStyle}>
                <Blog.MainPage.Link>Blog</Blog.MainPage.Link>
              </li>
              <li css={menuItemStyle}>
                <a href="mailto:hello@layrjs.com" target="_blank" rel="noopener noreferrer">
                  Contact
                </a>
              </li>
            </ul>
            <div css={columnGapStyle}>&nbsp;</div>
            <ul css={menuStyle}>
              <li css={menuItemStyle}>
                <a href="https://github.com/layrjs/layr" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
              <li css={menuItemStyle}>
                <a href="https://twitter.com/layrjs" target="_blank" rel="noopener noreferrer">
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

          <this.FrontendPlusBackendEqualsLoveView />
        </footer>
      );
    }

    @view() static FrontendPlusBackendEqualsLoveView() {
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

    @page('[/]*') static NotFoundPage() {
      return <this.NotFoundView />;
    }

    @view() static NotFoundView() {
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
          <img src={brokenHeart} alt="Layr" css={{width: 150}} />
          <div css={{marginTop: '2rem'}}>Sorry, there is nothing here.</div>
        </div>
      );
    }

    @view() static RootView() {
      const {UI} = this;

      const [router, isReady] = useBrowserRouter(this);

      if (!isReady) {
        return null;
      }

      const content = router.callCurrentRoute();

      return <UI.Root>{content}</UI.Root>;
    }
  }

  return Application;
};
