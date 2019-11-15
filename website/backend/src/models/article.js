import {field, method} from '@liaison/liaison';
import {Article as BaseArticle} from '@liaison/liaison-website-shared';
import slugify from 'slugify';

import {Entity} from './entity';
import {WithAuthor} from './with-author';

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
}
