import {expose, validators} from '@layr/component';
import {secondaryIdentifier, attribute, method} from '@layr/storable';
import slugify from 'slugify';
import RSS from 'rss';
import escape from 'lodash/escape';

import {Entity} from './entity';
import {WithAuthor} from './with-author';

const frontendURL = process.env.FRONTEND_URL;

if (!frontendURL) {
  throw new Error(`'FRONTEND_URL' environment variable is missing`);
}

const backendURL = process.env.BACKEND_URL;

if (!backendURL) {
  throw new Error(`'BACKEND_URL' environment variable is missing`);
}

const {rangeLength} = validators;

@expose({
  get: {call: true},
  find: {call: true},
  count: {call: true},
  prototype: {
    load: {call: true},
    save: {call: 'author'},
    delete: {call: 'author'}
  }
})
export class Article extends WithAuthor(Entity) {
  @expose({get: true, set: 'author'})
  @attribute('string', {validators: [rangeLength([1, 200])]})
  title = '';

  @expose({get: true, set: 'author'})
  @attribute('string', {validators: [rangeLength([1, 2000])]})
  description = '';

  @expose({get: true, set: 'author'})
  @attribute('string', {validators: [rangeLength([1, 50000])]})
  body = '';

  @expose({get: true})
  @secondaryIdentifier('string', {validators: [rangeLength([8, 300])]})
  slug = this.generateSlug();

  generateSlug() {
    this.validate({title: true});

    return (
      slugify(this.title, {remove: /[^\w\s-]/g}) +
      '-' +
      ((Math.random() * Math.pow(36, 6)) | 0).toString(36)
    );
  }

  // time curl -v -X POST -H "Content-Type: application/json" -d '{"query": {"<=": {"__component": "typeof Article"}, "getRSSFeed=>": {"()": []}}}' http://localhost:18888
  @expose({call: true}) @method() static async getRSSFeed() {
    const articles = await this.find(
      {},
      {
        title: true,
        description: true,
        slug: true,
        author: {fullName: true},
        createdAt: true
      },
      {
        sort: {createdAt: 'desc'},
        limit: 10
      }
    );

    const feed = new RSS({
      title: 'Layr Blog',
      description: 'Dramatically simplify full‑stack development',
      feed_url: `${backendURL}/blog/feed`,
      site_url: `${frontendURL}/blog`
    });

    for (const article of articles) {
      const url = `${frontendURL}/blog/articles/${article.slug}`;

      const description = `<p>${escape(
        article.description
      )}</p>\n<p><a href="${url}">Read more...</a></p>`;

      feed.item({
        url,
        title: article.title,
        description,
        author: article.author?.fullName,
        date: article.createdAt,
        guid: article.slug
      });
    }

    const xml = feed.xml({indent: true});

    return xml;
  }
}
