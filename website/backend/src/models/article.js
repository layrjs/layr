import {field, method} from '@liaison/liaison';
import {Article as BaseArticle} from '@liaison/liaison-website-shared';
import slugify from 'slugify';
import RSS from 'rss';
import escape from 'lodash/escape';

import {Entity} from './entity';
import {WithAuthor} from './with-author';
import {BACKEND_URL, FRONTEND_URL} from '../environment';

export class Article extends BaseArticle(WithAuthor(Entity)) {
  @field({expose: {get: 'anyone', set: ['creator', 'author']}}) title;

  @field({expose: {get: 'anyone', set: ['creator', 'author']}}) description;

  @field({expose: {get: 'anyone', set: ['creator', 'author']}}) body;

  @field({expose: {get: 'anyone'}}) slug;

  @method({expose: {call: 'anyone'}}) static $get;

  @method({expose: {call: 'anyone'}}) $load;

  @method({expose: {call: ['creator', 'author']}}) $save;

  async $beforeSave() {
    await super.$beforeSave();

    if (this.$isNew()) {
      this.generateSlug();
    }
  }

  generateSlug() {
    this.slug = slugify(this.title) + '-' + ((Math.random() * Math.pow(36, 6)) | 0).toString(36);
  }

  @method({expose: {call: 'author'}}) $delete;

  @method({expose: {call: 'anyone'}}) static $find;

  // time curl -v -X POST -H "Content-Type: application/json" -d '{"query": {"Article=>": {"getRSSFeed=>result": {"()": []}}}, "source": "frontend"}' http://localhost:18888
  @method({expose: {call: 'anyone'}}) static async getRSSFeed() {
    const articles = await this.$find({
      fields: {
        title: true,
        description: true,
        slug: true,
        author: {firstName: true, lastName: true},
        createdAt: true
      },
      sort: {createdAt: -1},
      limit: 10
    });

    const feed = new RSS({
      title: 'Liaison Blog',
      description: 'A love story between the frontend and the backend',
      feed_url: `${BACKEND_URL}/blog/feed`, // eslint-disable-line camelcase
      site_url: `${FRONTEND_URL}/blog` // eslint-disable-line camelcase
    });

    for (const article of articles) {
      const url = `${FRONTEND_URL}/blog/articles/${article.slug}`;

      const description = `<p>${escape(
        article.description
      )}</p>\n<p><a href="${url}">Read more...</a></p>`;

      feed.item({
        title: article.title,
        description,
        author: article.author.getFullName(),
        date: article.createdAt,
        guid: article.slug
      });
    }

    const xml = feed.xml({indent: true});

    return xml;
  }
}
