import {Model, field, Routable, route} from '@liaison/liaison';
import {view, useAsyncCall} from '@liaison/react-integration';
import {useMemo} from 'react';
import {jsx} from '@emotion/core';

/** @jsx jsx */

export class Blog extends Routable(Model) {
  @field('Article[]') loadedArticles;

  @route('/blog') @view() static Main() {
    const Blog = useMemo(() => new this(), []);

    return <Blog.Main />;
  }

  @route('/blog/articles') static Articles() {
    this.Main.$redirect();
  }

  @view() Main() {
    const {Article, common, ui} = this.$layer;

    const theme = ui.useTheme();

    const [isLoading, loadingError, retryLoading] = useAsyncCall(async () => {
      try {
        this.loadedArticles = await Article.$find({
          fields: {
            title: true,
            description: true,
            body: true,
            slug: true,
            author: {firstName: true, lastName: true, url: true},
            createdAt: true
          },
          sort: {createdAt: -1}
        });
      } catch (error) {
        error.displayMessage = 'Sorry, something went wrong while loading the articles.';
        throw error;
      }
    }, []);

    if (isLoading) {
      return <common.LoadingSpinner />;
    }

    if (loadingError) {
      return <common.ErrorMessage error={loadingError} onRetry={retryLoading} />;
    }

    const {loadedArticles} = this;

    if (loadedArticles.length === 0) {
      return <div>No articles are here... yet.</div>;
    }

    return (
      <common.Layout title="Blog">
        <h2 css={{color: theme.muted.textColor}}>Blog</h2>
        {loadedArticles.map((article, index) => {
          return (
            <div key={article.slug}>
              {index > 0 && <hr />}
              <article.Preview />
            </div>
          );
        })}
      </common.Layout>
    );
  }
}
