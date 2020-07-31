import {Component, consume, attribute} from '@liaison/component';
import {Routable, route} from '@liaison/routable';
import {view, useAsyncCall} from '@liaison/react-integration';
import {useMemo} from 'react';
import {jsx} from '@emotion/core';

import type {Article} from './article';
import type {Common} from './common';
import type {UI} from './ui';

export class Blog extends Routable(Component) {
  ['constructor']!: typeof Blog;

  @consume() static Article: ReturnType<typeof Article>;
  @consume() static Common: typeof Common;
  @consume() static UI: typeof UI;

  @attribute('Article[]?') loadedArticles?: InstanceType<ReturnType<typeof Article>>[];

  @view() static Layout({title = 'Blog', children}: {title?: string; children: React.ReactNode}) {
    const {Common, UI} = this;

    const theme = UI.useTheme();

    return (
      <Common.Layout title={title}>
        <h2>
          <this.Main.Link css={{color: theme.muted.textColor}}>Blog</this.Main.Link>
        </h2>
        {children}
      </Common.Layout>
    );
  }

  @route('/blog') @view() static Main() {
    const blog = useMemo(() => new this(), []);

    return <blog.Main />;
  }

  @route('/blog/articles') static Articles() {
    this.Main.redirect();
  }

  @view() Main() {
    const {Article, Common} = this.constructor;

    const [isLoading, loadingError, retryLoading] = useAsyncCall(async () => {
      try {
        this.loadedArticles = await Article.find(
          {},
          {
            title: true,
            description: true,
            slug: true,
            author: {fullName: true, url: true},
            createdAt: true
          },
          {sort: {createdAt: 'desc'}}
        );
      } catch (error) {
        error.displayMessage = 'Sorry, something went wrong while loading the articles.';
        throw error;
      }
    }, []);

    if (isLoading) {
      return <Common.LoadingSpinner />;
    }

    if (loadingError) {
      return <Common.ErrorMessage error={loadingError} onRetry={retryLoading} />;
    }

    const {loadedArticles} = this;

    if (loadedArticles!.length === 0) {
      return <div>No articles are here... yet.</div>;
    }

    return (
      <this.constructor.Layout>
        {loadedArticles!.map((article, index) => {
          return (
            <div key={article.slug}>
              {index > 0 && <hr />}
              <article.Preview />
            </div>
          );
        })}
      </this.constructor.Layout>
    );
  }
}
