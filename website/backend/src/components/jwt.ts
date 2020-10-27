import {Component} from '@layr/component';
import jwt from 'jsonwebtoken';

// Tip: Use `openssl rand -hex 64` to generate a JWT secret

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error(`'JWT_SECRET' environment variable is missing`);
}

const secretBuffer = Buffer.from(secret, 'hex');
const algorithm = 'HS256';

export class JWT extends Component {
  static generate(payload: object) {
    return jwt.sign(payload, secretBuffer, {algorithm});
  }

  static verify(token: string) {
    try {
      return jwt.verify(token, secretBuffer, {algorithms: [algorithm]});
    } catch (err) {
      return undefined;
    }
  }
}
