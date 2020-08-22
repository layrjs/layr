import {Component, consume} from '@liaison/component';
import {Routable, route} from '@liaison/routable';
import React, {Fragment, useCallback} from 'react';
import {view, useAsyncMemo, useAsyncCall} from '@liaison/react-integration';
import {jsx, css} from '@emotion/core';
import isEqual from 'lodash/isEqual';

import type {Common} from './common';
import type {UI} from './ui';

const VERSIONS = [{name: '1', value: 'v1'}];
const LANGUAGES = [
  {name: 'JavaScript', value: 'js'},
  {name: 'TypeScript', value: 'ts'}
];

const BASE_URL = '/docs';
const INDEX_PATH = 'index.json';

type Contents = {books: Book[]};

type Book = {title: string; slug: string; chapters: Chapter[]};

type Chapter = {
  title: string;
  slug: string;
  file: string;
  content: string;
  category: string | undefined;
  path: string[];
  nextChapter?: Chapter;
};

type Category = {
  name: string | undefined;
  chapters: Chapter[];
};

export class Docs extends Routable(Component) {
  ['constructor']!: typeof Docs;

  @consume() static Common: typeof Common;
  @consume() static UI: typeof UI;

  @view() static Layout({title = 'Docs', children}: {title?: string; children: React.ReactNode}) {
    const {Common} = this;

    return (
      <Common.Layout title={title} width={'960px'}>
        {children}
      </Common.Layout>
    );
  }

  @route('/docs/:version?/:path*\\?:language')
  @view()
  static Main({
    path = [],
    version,
    language
  }: {
    path?: string[];
    version?: string;
    language?: string;
  }) {
    const {Common, UI} = this;

    const [isLoading, loadingError, retryLoading] = useAsyncCall(async () => {
      await this.loadContents();
    }, []);

    if (isLoading) {
      return <Common.LoadingSpinner />;
    }

    if (loadingError !== undefined) {
      return <Common.ErrorMessage error={loadingError} onRetry={retryLoading} />;
    }

    const resolvedPath = this.resolvePath(path);
    const resolvedVersion = this.resolveVersion(version);
    const resolvedLanguage = this.resolveLanguage(language);

    if (resolvedVersion === undefined || resolvedLanguage === undefined) {
      return (
        <this.Layout>
          <Common.RouteNotFound />
        </this.Layout>
      );
    }

    if (resolvedPath !== undefined) {
      const resolvedParams = {
        path: resolvedPath,
        version: resolvedVersion,
        language: resolvedLanguage
      };

      if (!isEqual({path, version, language}, resolvedParams)) {
        const hash = this.getRouter().getCurrentHash();
        this.Main.redirect(resolvedParams, {hash, silent: true});
      }
    }

    return (
      <this.Layout>
        <div css={UI.responsive({display: 'flex', flexWrap: ['nowrap', , 'wrap-reverse']})}>
          <div css={UI.responsive({width: ['250px', , '100%'], paddingRight: [20, , 0]})}>
            <this.Contents />
          </div>

          {resolvedPath !== undefined ? (
            <React.Fragment>
              <hr css={UI.responsive({display: ['none', , 'block'], width: '100%'})} />

              <div css={{flexGrow: 1, flexBasis: 640}}>
                <this.Chapter />
              </div>
            </React.Fragment>
          ) : (
            <Common.RouteNotFound />
          )}
        </div>
      </this.Layout>
    );
  }

  @view() static Contents() {
    const {UI} = this;

    const router = this.getRouter();
    const theme = UI.useTheme();

    const {version, language} = router.getCurrentParams();

    const contents = this.getContents();

    const bookMenuStyle = css({...UI.styles.unstyledList, ...UI.styles.noMargins});
    const bookMenuItemStyle = css({marginTop: '1rem'});
    const bookMenuItemTitleStyle = css({
      marginBottom: '-.25rem',
      fontSize: '1.25rem',
      fontWeight: 600,
      color: theme.muted.textColor
    });

    const categoryMenuStyle = css({...UI.styles.unstyledList, ...UI.styles.noMargins});
    const categoryMenuItemStyle = css({marginTop: '.75rem'});
    const categoryMenuItemTitleStyle = css({
      fontSize: theme.small.fontSize,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 1
    });

    const chapterMenuStyle = css({
      ...UI.styles.unstyledList,
      ...UI.styles.noMargins,
      marginTop: '.2rem'
    });
    const chapterMenuItemStyle = css({
      marginTop: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: theme.link.primaryColor // Fixes the color of the ellipsis
    });

    return (
      <nav>
        <div css={{marginBottom: 20}}>
          <this.Options />
        </div>
        <ul css={bookMenuStyle}>
          {contents.books.map((book) => {
            const categories = getBookCategories(book);

            return (
              <li key={book.slug} css={bookMenuItemStyle}>
                <div css={bookMenuItemTitleStyle}>{book.title}</div>
                <ul css={categoryMenuStyle}>
                  {categories.map((category) => {
                    return (
                      <li key={category.name || 'uncategorized'} css={categoryMenuItemStyle}>
                        {category.name && (
                          <div css={categoryMenuItemTitleStyle}>{category.name}</div>
                        )}
                        <ul css={chapterMenuStyle}>
                          {category.chapters.map((chapter) => {
                            return (
                              <li key={chapter.slug} css={chapterMenuItemStyle}>
                                <this.Main.Link
                                  params={{path: chapter.path, version, language}}
                                  activeStyle={{color: theme.link.highlighted.primaryColor}}
                                >
                                  {chapter.title}
                                </this.Main.Link>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  @view() static Options() {
    const {UI} = this;

    const router = this.getRouter();
    const theme = UI.useTheme();

    const {path, version, language} = router.getCurrentParams();
    const hash = router.getCurrentHash();

    const changeLanguage = useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        const language = event.target.value;
        window.localStorage.setItem('language', language);
        this.Main.redirect({path, version, language}, {hash});
      },
      [path.join('/'), version, hash]
    );

    const labelStyle = css({
      marginBottom: 3,
      color: theme.muted.textColor,
      fontSize: theme.small.fontSize
    });

    return (
      <div css={{display: 'flex'}}>
        <div css={{display: 'flex', flexDirection: 'column', marginRight: 15}}>
          <label htmlFor="version-selector" css={labelStyle}>
            Version
          </label>
          <UI.Select id="version-selector" small>
            {VERSIONS.map(({name, value}) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </UI.Select>
        </div>

        <div css={{display: 'flex', flexDirection: 'column'}}>
          <label htmlFor="version-selector" css={labelStyle}>
            Language
          </label>
          <UI.Select id="version-selector" small value={language} onChange={changeLanguage}>
            {LANGUAGES.map(({name, value}) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </UI.Select>
        </div>
      </div>
    );
  }

  @view() static Chapter() {
    const {Common, UI} = this;

    const router = this.getRouter();
    const theme = UI.useTheme();

    const {path, version, language} = router.getCurrentParams();

    const [chapter, isLoading, loadingError, retryLoading] = useAsyncMemo(async () => {
      return await this.getChapter(path);
    }, [path.join('/')]);

    if (isLoading) {
      return <Common.LoadingSpinner />;
    }

    if (loadingError !== undefined || chapter === undefined) {
      return <Common.ErrorMessage error={loadingError} onRetry={retryLoading} />;
    }

    const {nextChapter} = chapter;

    return (
      <Fragment>
        <UI.Markdown languageFilter={language}>{chapter.content}</UI.Markdown>

        {nextChapter && (
          <div css={{marginBottom: 15}}>
            <hr />
            <div>
              <span style={{color: theme.muted.textColor}}>Next:</span>{' '}
              <this.Main.Link
                params={{path: nextChapter.path, version, language}}
                activeStyle={{color: theme.highlighted.textColor}}
              >
                {nextChapter.title} →
              </this.Main.Link>
            </div>
          </div>
        )}
      </Fragment>
    );
  }

  static _contents: Contents;

  static async loadContents() {
    if (this._contents === undefined) {
      try {
        const response = await fetch(`${BASE_URL}/${INDEX_PATH}`);
        const contents: Contents = await response.json();

        if (response.status !== 200) {
          throw new Error('An error occurred while fetching the documentation index');
        }

        for (const book of contents.books) {
          let previousChapter: Chapter | undefined;

          for (const chapter of book.chapters) {
            chapter.path = [book.slug, chapter.slug];

            if (previousChapter !== undefined) {
              previousChapter.nextChapter = chapter;
            }

            previousChapter = chapter;
          }
        }

        this._contents = contents;
      } catch (error) {
        error.displayMessage = 'Sorry, something went wrong while loading the documentation.';
        throw error;
      }
    }
  }

  static getContents() {
    return this._contents;
  }

  static async getChapter(path: string[]) {
    const contents = this.getContents();

    let [bookSlug, chapterSlug] = path;

    const book = contents.books.find((book) => book.slug === bookSlug);

    if (book === undefined) {
      throw new Error(`Book not found (path: '${path.join('/')}')`);
    }

    const chapter = book.chapters.find((chapter) => chapter.slug === chapterSlug);

    if (chapter === undefined) {
      throw new Error(`Chapter not found (path: '${path.join('/')}')`);
    }

    if (chapter.content === undefined) {
      try {
        const response = await fetch(`${BASE_URL}/${chapter.file}`);
        const content = await response.text();

        if (response.status !== 200) {
          throw new Error('An error occurred while fetching the chapter content');
        }

        chapter.content = content;
      } catch (error) {
        error.displayMessage =
          'Sorry, something went wrong while loading the documentation chapter.';
        throw error;
      }
    }

    return chapter;
  }

  static resolvePath(path: string[]) {
    const contents = this.getContents();

    let [bookSlug, chapterSlug, ...otherSlugs] = path;

    if (bookSlug === undefined || bookSlug === '') {
      bookSlug = contents.books[0].slug;
    }

    const book = contents.books.find((book) => book.slug === bookSlug);

    if (book === undefined) {
      return undefined;
    }

    if (chapterSlug === undefined || chapterSlug === '') {
      chapterSlug = book.chapters[0].slug;
    }

    const chapter = book.chapters.find((chapter) => chapter.slug === chapterSlug);

    if (chapter === undefined) {
      return undefined;
    }

    if (otherSlugs.length > 0) {
      return undefined;
    }

    return [book.slug, chapter.slug];
  }

  static resolveVersion(version: string | undefined) {
    if (version === undefined) {
      version = VERSIONS[0].value;
    }

    if (VERSIONS.find(({value}) => value === version) === undefined) {
      return undefined;
    }

    return version;
  }

  static resolveLanguage(language: string | undefined) {
    if (language === undefined) {
      language = window.localStorage.getItem('language') || LANGUAGES[0].value;
    }

    if (LANGUAGES.find(({value}) => value === language) === undefined) {
      return undefined;
    }

    return language;
  }
}

function getBookCategories(book: Book) {
  const categories: Category[] = [];

  for (const chapter of book.chapters) {
    if (categories.length === 0 || categories[categories.length - 1].name !== chapter.category) {
      categories.push({name: chapter.category, chapters: []});
    }

    categories[categories.length - 1].chapters.push(chapter);
  }

  return categories;
}
