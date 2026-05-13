import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'fallback-secret';

export function signToken(payload: { id: number; role: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: number; role: string } {
  return jwt.verify(token, SECRET) as { id: number; role: string };
}
