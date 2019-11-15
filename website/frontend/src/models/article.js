import {Routable, route} from '@liaison/liaison';
import {view, useAsyncCallback} from '@liaison/react-integration';
import {useMemo} from 'react';
import {jsx} from '@emotion/core';
import marked from 'marked';
import DOMPurify from 'dompurify';
import {Article as BaseArticle} from '@liaison/liaison-website-shared';
import {format} from 'date-fns';

import {Entity} from './entity';
import {WithAuthor} from './with-author';

/** @jsx jsx */

export class Article extends Routable(BaseArticle(WithAuthor(Entity))) {
  @route('/blog/articles/:slug') @view() static Main({slug}) {
    return (
      <this.Loader
        query={{slug}}
        fields={{
          title: true,
          description: true,
          body: true,
          slug: true,
          author: {firstName: true, lastName: true, url: true},
          createdAt: true
        }}
      >
        {article => <article.Main />}
      </this.Loader>
    );
  }

  @view() Main() {
    const {Blog} = this.$layer;

    const bodyHTML = {__html: DOMPurify.sanitize(marked(this.body))};

    return (
      <Blog.Layout>
        <h2>{this.title}</h2>
        <this.Meta css={{marginTop: '-.75rem', marginBottom: '1.5rem'}} />
        <div dangerouslySetInnerHTML={bodyHTML} />
      </Blog.Layout>
    );
  }

  @view() Preview() {
    return (
      <>
        <div
          onClick={() => {
            this.constructor.Main.$navigate(this);
          }}
          css={{cursor: 'pointer'}}
        >
          <h4>{this.title}</h4>
          <div>{this.description}</div>
        </div>
        <this.Meta />
      </>
    );
  }

  @view() Meta({...props}) {
    const {ui} = this.$layer;

    const theme = ui.useTheme();

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
          {this.author.getFullName()}
        </a>
      </p>
    );
  }

  @route('/blog/editor') @view() static Creator() {
    const {Home, session} = this.$layer;

    if (!session.user) {
      Home.Main.$redirect();
      return null;
    }

    const article = useMemo(() => new this());

    return <article.Creator />;
  }

  @view() Creator() {
    const {Article, common} = this.$layer;

    const [handleSave, , savingError] = useAsyncCallback(async () => {
      await this.$save();
      Article.Main.$navigate(this);
    }, []);

    return (
      <common.Layout title="Blog">
        {savingError && <common.ErrorMessage error={savingError} />}

        <this.Form onSubmit={handleSave} />
      </common.Layout>
    );
  }

  @route('/blog/editor/:slug') @view() static Editor({slug}) {
    return (
      <this.Loader query={{slug}} fields={{title: true, description: true, body: true}}>
        {article => <article.Editor />}
      </this.Loader>
    );
  }

  @view() Editor() {
    const {Article, common} = this.$layer;

    const fork = useMemo(() => this.$fork(), []);

    const [handleSave, , savingError] = useAsyncCallback(async () => {
      await fork.$save();
      this.$merge(fork);
      Article.Main.$navigate(this);
    }, [fork]);

    return (
      <common.Layout title="Blog">
        {savingError && <common.ErrorMessage error={savingError} />}

        <fork.Form onSubmit={handleSave} />
      </common.Layout>
    );
  }

  @view() Form({onSubmit}) {
    const [handleSubmit, isSubmitting] = useAsyncCallback(
      async event => {
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
              onChange={event => {
                this.title = event.target.value;
              }}
              required
              css={{width: '100%'}}
            />
          </div>

          <div css={{marginTop: '1rem'}}>
            <textarea
              rows="5"
              placeholder="Description"
              value={this.description}
              onChange={event => {
                this.description = event.target.value;
              }}
              required
              css={{width: '100%'}}
            />
          </div>

          <div css={{marginTop: '1rem'}}>
            <textarea
              rows="20"
              placeholder="Body"
              value={this.body}
              onChange={event => {
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
