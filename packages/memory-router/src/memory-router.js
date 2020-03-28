import {AbstractRouter} from '@liaison/abstract-router';
import {normalizeURL} from '@liaison/routable';
import ow from 'ow';

export class MemoryRouter extends AbstractRouter {
  constructor(routables, options = {}) {
    ow(
      options,
      'options',
      ow.object.exactShape({
        initialURLs: ow.optional.array,
        initialIndex: ow.optional.number.integer
      })
    );

    const {initialURLs = [], initialIndex = initialURLs.length - 1, ...otherOptions} = options;

    super(routables, otherOptions);

    this._urls = initialURLs.map(normalizeURL);
    this._index = initialIndex;
  }

  _getCurrentURL() {
    if (this._index === -1) {
      throw new Error('The router has no current URL');
    }

    return this._urls[this._index];
  }

  _navigate(url) {
    this._urls.splice(this._index + 1);
    this._urls.push(url);
    this._index++;

    this.callObservers();
  }

  _redirect(url) {
    if (this._index === -1) {
      throw new Error('The router has no current URL');
    }

    this._urls.splice(this._index);
    this._urls.push(url);

    this.callObservers();
  }

  _go(delta) {
    let index = this._index;

    index += delta;

    if (index < 0 || index > this._urls.length - 1) {
      throw new Error('Cannot go to an entry that does not exist in the router history');
    }

    this._index = index;

    this.callObservers();
  }

  _getHistoryLength() {
    return this._urls.length;
  }
}
