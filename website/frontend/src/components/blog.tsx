import {Component, consume} from '@layr/component';
import {Routable} from '@layr/routable';
import {Fragment} from 'react';
import {layout, page, useData} from '@layr/react-integration';
import {jsx, useTheme} from '@emotion/react';

import type {createArticleComponent} from './article';
import {Title} from '../utilities';

export class Blog extends Routable(Component) {
  ['constructor']!: typeof Blog;

  @consume() static Article: ReturnType<typeof createArticleComponent>;

  @layout('[/]blog') static MainLayout({children}: {children: () => any}) {
    const theme = useTheme();

    return (
      <div css={{flexBasis: 650}}>
        <Title>Blog</Title>
        <h2 css={{marginBottom: '2rem'}}>
          <this.MainPage.Link css={{color: theme.colors.text.muted}}>Blog</this.MainPage.Link>
        </h2>
        {children()}
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
        <>
          {articles.map((article, index) => (
            <div key={article.slug}>
              {index > 0 && <hr />}
              <article.ListItemView />
            </div>
          ))}
        </>
      )
    );
  }
}
