import {consume} from '@layr/component';
import {Routable} from '@layr/routable';
import {layout, page, view, useData, useAction} from '@layr/react-integration';
import {Fragment, useMemo} from 'react';
import {jsx} from '@emotion/core';
import {format} from 'date-fns';

import type {Article as BackendArticle} from '../../../backend/src/components/article';
import type {Home} from './home';
import type {UI} from './ui';
import {useTitle} from '../utilities';

export const creteArticleComponent = (Base: typeof BackendArticle) => {
  class Article extends Routable(Base) {
    ['constructor']!: typeof Article;

    @consume() static Home: typeof Home;
    @consume() static UI: typeof UI;

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
      const {UI} = this.constructor;

      UI.useAnchor();

      return (
        <Fragment>
          <h2>{this.title}</h2>
          <this.MetaView css={{marginTop: '-.75rem', marginBottom: '1.5rem'}} />
          <UI.Markdown>{this.body}</UI.Markdown>
        </Fragment>
      );
    }

    @view() ListItemView() {
      const {UI} = this.constructor;

      const theme = UI.useTheme();

      return (
        <Fragment>
          <this.ItemPage.Link>
            <h4 css={{':hover': {color: theme.link.highlighted.primaryColor}}}>{this.title}</h4>
          </this.ItemPage.Link>
          <this.MetaView css={{marginTop: '-.75rem'}} />
        </Fragment>
      );
    }

    @view() MetaView({...props}) {
      const {UI} = this.constructor;

      const theme = UI.useTheme();

      return (
        <p css={{color: theme.muted.textColor}} {...props}>
          <span>{format(this.createdAt, 'MMMM do, y')}</span>
          {' by '}
          <a
            href={this.author.url}
            target="_blank"
            rel="noopener noreferrer"
            css={{color: theme.muted.textColor}}
          >
            {this.author.fullName}
          </a>
        </p>
      );
    }

    @page('[/blog]/articles/add') static AddPage() {
      const {Session, Home} = this;

      if (Session.user === undefined) {
        Home.MainPage.redirect(undefined, {defer: true});
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
        Home.MainPage.redirect(undefined, {defer: true});
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
          <h2>Article</h2>

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await onSubmit();
            }}
            autoComplete="off"
          >
            <div css={{marginTop: '1rem'}}>
              <input
                type="text"
                placeholder="Title"
                value={this.title}
                onChange={(event) => {
                  this.title = event.target.value;
                }}
                required
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <textarea
                rows={5}
                placeholder="Description"
                value={this.description}
                onChange={(event) => {
                  this.description = event.target.value;
                }}
                required
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <textarea
                rows={20}
                placeholder="Body"
                value={this.body}
                onChange={(event) => {
                  this.body = event.target.value;
                }}
                required
                css={{width: '100%'}}
              />
            </div>

            <div css={{marginTop: '1rem'}}>
              <button type="submit">Publish</button>
            </div>
          </form>
        </div>
      );
    }
  }

  return Article;
};
