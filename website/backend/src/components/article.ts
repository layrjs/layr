import {expose, validators} from '@layr/component';
import {secondaryIdentifier, attribute, method} from '@layr/storable';
import {Routable, httpRoute} from '@layr/routable';
import slugify from 'slugify';
import RSS from 'rss';
import escape from 'lodash/escape';

import {Entity} from './entity';
import {WithAuthor} from './with-author';

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
export class Article extends Routable(WithAuthor(Entity)) {
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

  // time curl -v http://localhost:18888/blog/feed
  @httpRoute('GET', '/blog/feed', {
    transformers: {
      output(result) {
        return {
          status: 200,
          headers: {'content-type': 'application/rss+xml'},
          body: result
        };
      }
    }
  })
  @expose({call: true})
  @method()
  static async getRSSFeed() {
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
      feed_url: `${process.env.BACKEND_URL}blog/feed`,
      site_url: `${process.env.FRONTEND_URL}blog`
    });

    for (const article of articles) {
      const url = `${process.env.FRONTEND_URL}blog/articles/${article.slug}`;

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
