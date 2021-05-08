import {Component, consume} from '@layr/component';
import {Routable} from '@layr/routable';
import {Fragment} from 'react';
import {layout, page, useData} from '@layr/react-integration';
import {jsx} from '@emotion/core';

import type {creteArticleComponent} from './article';
import type {UI} from './ui';
import {useTitle} from '../utilities';

export class Blog extends Routable(Component) {
  ['constructor']!: typeof Blog;

  @consume() static Article: ReturnType<typeof creteArticleComponent>;
  @consume() static UI: typeof UI;

  @layout('[/]blog') static MainLayout({children}: {children: () => any}) {
    const {UI} = this;

    const theme = UI.useTheme();

    useTitle('Blog');

    return (
      <div css={{flexBasis: 650}}>
        <Fragment>
          <h2>
            <this.MainPage.Link css={{color: theme.muted.textColor}}>Blog</this.MainPage.Link>
          </h2>
          {children()}
        </Fragment>
      </div>
    );
  }

  @page('[/blog]', {aliases: ['[/blog]/articles']}) static MainPage() {
    const {Article} = this;

    return useData(
      async () =>
        await Article.find(
          {},
          {
            title: true,
            slug: true,
            author: {fullName: true, url: true},
            createdAt: true
          },
          {sort: {createdAt: 'desc'}}
        ),

      (articles) => (
        <Fragment>
          {articles.map((article, index) => (
            <div key={article.slug}>
              {index > 0 && <hr />}
              <article.ListItemView />
            </div>
          ))}
        </Fragment>
      )
    );
  }
}
