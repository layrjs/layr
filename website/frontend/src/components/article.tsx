import {consume} from '@layr/component';
import {Routable} from '@layr/routable';
import {layout, page, view, useData, useAction} from '@layr/react-integration';
import {Fragment, useMemo} from 'react';
import {jsx, useTheme} from '@emotion/react';
import {Input, TextArea, Button} from '@emotion-starter/react';
import {Stack} from '@emotion-kit/react';
import {format} from 'date-fns';

import type {Article as BackendArticle} from '../../../backend/src/components/article';
import type {Home} from './home';
import {Markdown} from '../markdown';
import {useTitle} from '../utilities';

export const creteArticleComponent = (Base: typeof BackendArticle) => {
  class Article extends Routable(Base) {
    ['constructor']!: typeof Article;

    @consume() static Home: typeof Home;

    @layout('[/blog]/articles/:slug') ItemLayout({children}: {children: () => any}) {
      return useData(
        async () => {
          await this.load({
            title: true,
            description: true,
            body: true,
            slug: true,
            author: {fullName: true, url: true},
            createdAt: true
          });
        },

        () => {
          useTitle(this.title);

          return children();
        },

        [], // Getter deps

        [children] // Renderer deps
      );
    }

    @page('[/blog/articles/:slug]') ItemPage() {
      return (
        <>
          <h2>{this.title}</h2>
          <this.MetaView css={{marginTop: '-.75rem', marginBottom: '1.5rem'}} />
          <Markdown>{this.body}</Markdown>
        </>
      );
    }

    @view() ListItemView() {
      const theme = useTheme();

      return (
        <>
          <this.ItemPage.Link>
            <h4 css={{':hover': {color: theme.colors.primary.highlighted}}}>{this.title}</h4>
          </this.ItemPage.Link>
          <this.MetaView css={{marginTop: '-.75rem'}} />
        </>
      );
    }

    @view() MetaView({...props}) {
      const theme = useTheme();

      return (
        <p css={{color: theme.colors.text.muted}} {...props}>
          <span>{format(this.createdAt, 'MMMM do, y')}</span>
          {' by '}
          <a
            href={this.author.url}
            target="_blank"
            rel="noopener noreferrer"
            css={{color: theme.colors.text.muted}}
          >
            {this.author.fullName}
          </a>
        </p>
      );
    }

    @page('[/blog]/articles/add') static AddPage() {
      const {Session, Home} = this;

      if (Session.user === undefined) {
        Home.MainPage.redirect();
        return null;
      }

      const article = useMemo(() => new this(), []);

      const save = useAction(async () => {
        await article.save();
        article.ItemPage.navigate();
      }, [article]);

      return <article.FormView onSubmit={save} />;
    }

    @page('[/blog/articles/:slug]/edit') EditPage() {
      const {Session, Home} = this.constructor;

      if (Session.user === undefined) {
        Home.MainPage.redirect();
        return null;
      }

      const fork = useMemo(() => this.fork(), []);

      const save = useAction(async () => {
        await fork.save();
        this.merge(fork);
        this.ItemPage.navigate();
      }, [fork]);

      return <fork.FormView onSubmit={save} />;
    }

    @view() FormView({onSubmit}: {onSubmit: Function}) {
      return (
        <div>
          <h3>Article</h3>

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await onSubmit();
            }}
            autoComplete="off"
            css={{marginTop: '1rem'}}
          >
            <Stack direction="column">
              <Input
                type="text"
                value={this.title}
                onChange={(event) => {
                  this.title = event.target.value;
                }}
                placeholder="Title"
                required
              />

              <TextArea
                rows={5}
                value={this.description}
                onChange={(event) => {
                  this.description = event.target.value;
                }}
                placeholder="Description"
                required
              />

              <TextArea
                rows={20}
                value={this.body}
                onChange={(event) => {
                  this.body = event.target.value;
                }}
                placeholder="Body"
                required
              />
            </Stack>

            <Button type="submit" color="primary" css={{marginTop: '1.5rem'}}>
              Publish
            </Button>
          </form>
        </div>
      );
    }
  }

  return Article;
};
