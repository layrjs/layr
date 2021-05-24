import {provide} from '@layr/component';
import {Routable} from '@layr/routable';
import {useState} from 'react';
import {layout, page, view} from '@layr/react-integration';
import {jsx, useTheme} from '@emotion/react';
import {EmotionStarter} from '@emotion-starter/react';
import {EmotionKit, Container, Stack} from '@emotion-kit/react';

import type {Application as BackendApplication} from '../../../backend/src/components/application';
import {Home} from './home';
import {Docs} from './docs';
import {createSessionComponent} from './session';
import {createUserComponent} from './user';
import {Blog} from './blog';
import {creteArticleComponent} from './article';
import {createNewsletterComponent} from './newsletter';
import {getGlobalStyles, useStyles} from '../styles';
import {FullHeight} from '../utilities';

import layrLogo from '../assets/layr-logo-with-icon-dark-mode.svg';
import brokenHeart from '../assets/broken-heart.svg';
import love from '../assets/f-plus-b-equals-love.svg';

export const createApplicationComponent = (Base: typeof BackendApplication) => {
  class Application extends Routable(Base) {
    @provide() static Home = Home;
    @provide() static Docs = Docs;
    @provide() static Session = createSessionComponent(Base.Session);
    @provide() static User = createUserComponent(Base.User);
    @provide() static Blog = Blog;
    @provide() static Article = creteArticleComponent(Base.Article);
    @provide() static Newsletter = createNewsletterComponent(Base.Newsletter);

    @layout('/') static MainLayout({children}: {children: () => any}) {
      const {Home} = this;

      return (
        <EmotionStarter
          mode={'dark'}
          theme={{
            fontFamilies: {body: "'Open Sans', sans-serif", heading: "'Open Sans', sans-serif"}
          }}
          globalStylesGetter={getGlobalStyles}
        >
          {(theme) => (
            <EmotionKit>
              {Home.MainPage.isActive() ? (
                children()
              ) : (
                <FullHeight css={{display: 'flex', flexDirection: 'column'}}>
                  <div>
                    <Container>
                      <this.HeaderView />
                    </Container>
                  </div>

                  <div
                    css={theme.responsive({
                      flexGrow: 1,
                      display: 'flex',
                      padding: ['2rem', , '2rem 15px'],
                      justifyContent: 'center'
                    })}
                  >
                    {children()}
                  </div>

                  <div css={{backgroundColor: theme.colors.background.highlighted}}>
                    <Container>
                      <this.FooterView />
                    </Container>
                  </div>
                </FullHeight>
              )}
            </EmotionKit>
          )}
        </EmotionStarter>
      );
    }

    @view() static HeaderView() {
      const {Home, Docs, Blog} = this;

      const theme = useTheme();
      const styles = useStyles();

      return (
        <header css={{minHeight: 60, padding: '.5rem 0', display: 'flex', alignItems: 'center'}}>
          <Home.MainPage.Link css={{display: 'flex', flexDirection: 'column'}}>
            <img src={layrLogo} alt="Layr" css={{height: 32}} />
          </Home.MainPage.Link>

          <div css={{marginLeft: '0.6rem', marginTop: '7px'}}>
            <small css={{color: theme.colors.text.muted, letterSpacing: '0.04rem'}}>v1</small>
          </div>

          <Stack spacing="1.5rem" css={{marginLeft: 'auto', alignItems: 'center'}}>
            <Docs.MainPage.Link>Docs</Docs.MainPage.Link>
            <Blog.MainPage.Link>Blog</Blog.MainPage.Link>
            <a
              href="https://github.com/layrjs/layr"
              target="_blank"
              rel="noopener noreferrer"
              css={theme.responsive({
                ...styles.menuItemLink,
                display: ['inline-block', , , 'none']
              })}
            >
              GitHub
            </a>
          </Stack>
        </header>
      );
    }

    @view() static FooterView() {
      const {Docs, Blog} = this;

      const theme = useTheme();
      const styles = useStyles();

      return (
        <footer
          css={{padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center'}}
        >
          <nav
            css={theme.responsive({
              width: '100%',
              maxWidth: 200,
              display: 'flex',
              flexDirection: ['row', , , 'column'],
              justifyContent: 'space-between',
              lineHeight: theme.lineHeights.small
            })}
          >
            <div>
              <Stack direction="column">
                <Docs.MainPage.Link>Docs</Docs.MainPage.Link>
                <Blog.MainPage.Link>Blog</Blog.MainPage.Link>
                <a
                  href="mailto:hello@layrjs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  css={styles.menuItemLink}
                >
                  Contact
                </a>
              </Stack>
            </div>

            <div css={theme.responsive({marginTop: [, , , '1rem']})}>
              <Stack direction="column">
                <a
                  href="https://github.com/layrjs/layr"
                  target="_blank"
                  rel="noopener noreferrer"
                  css={styles.menuItemLink}
                >
                  GitHub
                </a>
                <a
                  href="https://twitter.com/layrjs"
                  target="_blank"
                  rel="noopener noreferrer"
                  css={styles.menuItemLink}
                >
                  Twitter
                </a>
                <a
                  href="https://www.youtube.com/channel/UCa2ZQbL0tlSR97GelMdgm6g"
                  target="_blank"
                  rel="noopener noreferrer"
                  css={styles.menuItemLink}
                >
                  YouTube
                </a>
              </Stack>
            </div>
          </nav>

          <this.FrontendPlusBackendEqualsLoveView />
        </footer>
      );
    }

    @view() static FrontendPlusBackendEqualsLoveView() {
      const theme = useTheme();

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
            <div>
              <small style={{color: theme.colors.primary.normal}}>Frontend</small>
              <small style={{color: theme.colors.text.muted}}> + </small>
              <small style={{color: theme.colors.secondary.normal}}>Backend</small>
              <small style={{color: theme.colors.text.muted}}> = </small>
              <small style={{color: theme.colors.tertiary.normal}}>Love</small>
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
  }

  return Application;
};
