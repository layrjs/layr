import {consume} from '@liaison/component';
import {Routable, route} from '@liaison/routable';
import {view, useAsyncCallback, useAsyncMemo} from '@liaison/react-integration';
import {Fragment, useMemo} from 'react';
import {jsx} from '@emotion/core';
import {format} from 'date-fns';

import type {Article as BackendArticle} from '../../../backend/src/components/article';
import {Home} from './home';
import {Blog} from './blog';
import {Common} from './common';
import {UI} from './ui';

export const Article = (Base: typeof BackendArticle) => {
  class Article extends Routable(Base) {
    ['constructor']!: typeof Article;

    @consume() static Home: typeof Home;
    @consume() static Blog: typeof Blog;
    @consume() static Common: typeof Common;
    @consume() static UI: typeof UI;

    @route('/blog/articles/:slug') @view() static Main({slug}: {slug: string}) {
      return <this.Loader slug={slug}>{(article) => <article.Main />}</this.Loader>;
    }

    @view() static Loader({
      slug,
      children
    }: {
      slug: string;
      children: (article: Article) => JSX.Element;
    }) {
      const {Common} = this;

      const [article, isLoading, loadingError, retryLoading] = useAsyncMemo(async () => {
        try {
          return await this.get(
            {slug},
            {
              title: true,
              description: true,
              body: true,
              slug: true,
              author: {fullName: true, url: true},
              createdAt: true
            }
          );
        } catch (error) {
          error.displayMessage = `Sorry, something went wrong while loading the ${this.getComponentName().toLowerCase()} information.`;
          throw error;
        }
      }, [slug]);

      if (isLoading) {
        return <Common.LoadingSpinner />;
      }

      if (loadingError) {
        return <Common.ErrorMessage error={loadingError} onRetry={retryLoading} />;
      }

      return children(article!);
    }

    @view() Main() {
      const {Blog, UI} = this.constructor;

      UI.useAnchor();

      return (
        <Blog.Layout title={this.title}>
          <h2>{this.title}</h2>
          <this.Meta css={{marginTop: '-.75rem', marginBottom: '1.5rem'}} />
          <UI.Markdown>{this.body}</UI.Markdown>
        </Blog.Layout>
      );
    }

    @view() Preview() {
      return (
        <Fragment>
          <div
            onClick={() => {
              this.constructor.Main.navigate(this);
            }}
            css={{cursor: 'pointer'}}
          >
            <h4>{this.title}</h4>
            <div>{this.description}</div>
          </div>
          <this.Meta />
        </Fragment>
      );
    }

    @view() Meta({...props}) {
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

    @route('/blog/editor') @view() static Creator() {
      const {Session, Home} = this;

      if (!Session.user) {
        Home.Main.redirect();
        return null;
      }

      const article = useMemo(() => new this(), []);

      return <article.Creator />;
    }

    @view() Creator() {
      const Article = this.constructor;
      const {Common} = Article;

      const [handleSave, , savingError] = useAsyncCallback(async () => {
        await this.save();
        Article.Main.navigate(this);
      }, []);

      return (
        <Common.Layout title="Blog">
          {savingError && <Common.ErrorMessage error={savingError} />}

          <this.Form onSubmit={handleSave} />
        </Common.Layout>
      );
    }

    @route('/blog/editor/:slug') @view() static Editor({slug}: {slug: string}) {
      return <this.Loader slug={slug}>{(article) => <article.Editor />}</this.Loader>;
    }

    @view() Editor() {
      const Article = this.constructor;
      const {Common} = Article;

      const fork = useMemo(() => this.fork(), []);

      const [handleSave, , savingError] = useAsyncCallback(async () => {
        await fork.save();
        this.merge(fork);
        Article.Main.navigate(this);
      }, [fork]);

      return (
        <Common.Layout title="Blog">
          {savingError && <Common.ErrorMessage error={savingError} />}

          <fork.Form onSubmit={handleSave} />
        </Common.Layout>
      );
    }

    @view() Form({onSubmit}: {onSubmit: Function}) {
      const [handleSubmit, isSubmitting] = useAsyncCallback(
        async (event) => {
          event.preventDefault();
          await onSubmit();
        },
        [onSubmit]
      );

      return (
        <div>
          <h2>Article</h2>

          <form onSubmit={handleSubmit} autoComplete="off">
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
              <button type="submit" disabled={isSubmitting}>
                Publish
              </button>
            </div>
          </form>
        </div>
      );
    }
  }

  return Article;
};
