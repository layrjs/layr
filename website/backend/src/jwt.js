import {Registerable} from '@liaison/liaison';
import jwt from 'jsonwebtoken';
import ow from 'ow';

const ALGORITHM = 'HS256';

// Tip: Use `openssl rand -hex 64` to generate a JWT secret

export class JWT extends Registerable() {
  constructor(secret) {
    ow(secret, ow.string.nonEmpty);

    super();

    this._secret = Buffer.from(secret, 'hex');
  }

  generate(payload) {
    ow(payload, ow.object.plain.nonEmpty);

    return jwt.sign(payload, this._secret, {algorithm: ALGORITHM});
  }

  verify(token) {
    ow(token, ow.string.nonEmpty);

    try {
      return jwt.verify(token, this._secret, {algorithms: [ALGORITHM]});
    } catch (err) {
      return undefined;
    }
  }
}
