import {formatCode} from '@resdir/console';
import {createClientError} from '@resdir/error';

export default () => ({
  validate() {
    if (!this.domainName) {
      throw createClientError(`${formatCode('domainName')} attribute is missing`);
    }
  }
});
