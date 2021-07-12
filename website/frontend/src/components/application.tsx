import {provide} from '@layr/component';
import {Routable} from '@layr/routable';
import {useState} from 'react';
import {layout, page, view, Customizer} from '@layr/react-integration';
import {jsx, useTheme} from '@emotion/react';
import {EmotionStarter} from '@emotion-starter/react';
import {EmotionKit, Container, Stack} from '@emotion-kit/react';

import type {Application as BackendApplication} from '../../../backend/src/components/application';
import {Home} from './home';
import {Docs, LAST_VERSION} from './docs';
import {extendUser} from './user';
import {Blog} from './blog';
import {extendArticle} from './article';
import {extendNewsletter} from './newsletter';
import {getGlobalStyles, useStyles} from '../styles';
import {FullHeight, ErrorMessage, LoadingSpinner} from '../ui';

import layrLogo from '../assets/layr-logo-with-icon-dark-mode.svg';
import love from '../assets/f-plus-b-equals-love.svg';
import pageNotFound from '../assets/page-not-found.png';

export const extendApplication = (Base: typeof BackendApplication) => {
  class Application extends Routable(Base) {
    @provide() static User = extendUser(Base.User);
    @provide() static Home = Home;
    @provide() static Docs = Docs;
    @provide() static Blog = Blog;
    @provide() static Article = extendArticle(Base.Article);
    @provide() static Newsletter = extendNewsletter(Base.Newsletter);

    @layout('') static RootLayout({children}: {children: () => any}) {
      return (
        <EmotionStarter
          mode={'dark'}
          theme={{
            fontFamilies: {body: "'Open Sans', sans-serif", heading: "'Open Sans', sans-serif"}
          }}
          globalStylesGetter={getGlobalStyles}
        >
          <EmotionKit>
            <Customizer
              dataPlaceholder={() => <LoadingSpinner />}
              errorRenderer={(error) => <ErrorMessage>{error}</ErrorMessage>}
            >
              {children()}
            </Customizer>
          </EmotionKit>
        </EmotionStarter>
      );
    }

    @layout('[]/') static MainLayout({children}: {children: () => any}) {
      const theme = useTheme();

      return (
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
            <small css={{color: theme.colors.text.muted, letterSpacing: '0.04rem'}}>
              {LAST_VERSION}
            </small>
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
              <Stack direction="column" css={theme.responsive({textAlign: [, , , 'center']})}>
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

            <div css={theme.responsive({marginTop: [, , , '1rem'], textAlign: [, , , 'center']})}>
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

          <div css={{marginTop: '3rem'}}>
            <small css={{color: theme.colors.text.muted}}>
              A{' '}
              <a href="https://1place.io" target="_blank" css={styles.hiddenLink}>
                1Place
              </a>{' '}
              open source project.
            </small>
          </div>

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
            padding: '3rem 15px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <img src={pageNotFound} alt="Page not found" css={{width: 350, maxWidth: '100%'}} />
          <h4 css={{marginTop: '3rem', textAlign: 'center'}}>Sorry, there is nothing here.</h4>
        </div>
      );
    }
  }

  return Application;
};
