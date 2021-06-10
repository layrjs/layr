import jwt from 'jsonwebtoken';

// Tip: Use `openssl rand -hex 64` to generate a JWT secret

const secretBuffer = Buffer.from(process.env.JWT_SECRET!, 'hex');
const algorithm = 'HS256';

export function generateJWT(payload: object) {
  return jwt.sign(payload, secretBuffer, {algorithm});
}

export function verifyJWT(token: string) {
  try {
    return jwt.verify(token, secretBuffer, {algorithms: [algorithm]});
  } catch (err) {
    return undefined;
  }
}
