import {Component, consume} from '@layr/component';
import {Routable} from '@layr/routable';
import {Fragment, useMemo} from 'react';
import {layout, page, useData, useAction} from '@layr/react-integration';
import {jsx, useTheme} from '@emotion/react';

import type {extendUser} from './user';
import type {Home} from './home';
import type {extendArticle} from './article';
import {Title} from '../ui';

export class Blog extends Routable(Component) {
  declare ['constructor']: typeof Blog;

  @consume() static User: ReturnType<typeof extendUser>;
  @consume() static Home: typeof Home;
  @consume() static Article: ReturnType<typeof extendArticle>;

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

  @page('[/blog]/articles/add') static AddArticlePage() {
    const {User, Home, Article} = this;

    if (User.authenticatedUser === undefined) {
      Home.MainPage.redirect();
      return null;
    }

    const article = useMemo(() => new Article({author: User.authenticatedUser}), []);

    const save = useAction(async () => {
      await article.save();
      article.ItemPage.navigate();
    }, [article]);

    return <article.FormView onSubmit={save} />;
  }
}
