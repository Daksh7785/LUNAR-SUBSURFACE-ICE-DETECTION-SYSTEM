import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../config/logger';
import { env } from '../config/env';

// Utility for hashing password (using SHA-256 for no-external-dependency robust implementation)
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const generateTokens = (user: { id: string; email: string; role: string; fullName: string }) => {
  const secret = env.JWT_SECRET;
  const token = jwt.sign(user, secret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, secret, { expiresIn: '7d' });
  return { token, refreshToken };
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, fullName, organization, role } = req.body;

    // Check existing user
    const existCheck = await db.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (existCheck.rowCount && existCheck.rowCount > 0) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    const passwordHash = hashPassword(password);
    const userRole = role || 'scientist';

    const insertRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, organization, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, organization, role, created_at`,
      [email, passwordHash, fullName, organization, userRole]
    );

    const user = insertRes.rows[0];
    const { token, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    // Store refresh token
    const tokenHash = hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    logger.info('User registered successfully', { userId: user.id, email: user.email });
    res.status(201).json({
      message: 'User registered successfully',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        organization: user.organization,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const userRes = await db.query(
      'SELECT id, email, password_hash, full_name, organization, role FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (!userRes.rowCount || userRes.rowCount === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = userRes.rows[0];
    if (hashPassword(password) !== user.password_hash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const { token, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    const tokenHash = hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    logger.info('User logged in successfully', { userId: user.id, email: user.email });
    res.status(200).json({
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        organization: user.organization,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const secret = env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret) as { id: string };
    } catch {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const tokenHash = hashPassword(refreshToken);
    const tokenRes = await db.query(
      'SELECT id, revoked_at FROM refresh_tokens WHERE token_hash = $1 AND user_id = $2',
      [tokenHash, decoded.id]
    );

    if (!tokenRes.rowCount || tokenRes.rowCount === 0 || tokenRes.rows[0].revoked_at) {
      res.status(401).json({ error: 'Refresh token revoked or invalid' });
      return;
    }

    const userRes = await db.query('SELECT id, email, full_name, role FROM users WHERE id = $1', [decoded.id]);
    if (!userRes.rowCount || userRes.rowCount === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const user = userRes.rows[0];
    const newTokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    // Revoke old token and store new one
    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
    const newTokenHash = hashPassword(newTokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, newTokenHash, expiresAt]
    );

    res.status(200).json({ token: newTokens.token, refreshToken: newTokens.refreshToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = hashPassword(refreshToken);
      await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
    }
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};
