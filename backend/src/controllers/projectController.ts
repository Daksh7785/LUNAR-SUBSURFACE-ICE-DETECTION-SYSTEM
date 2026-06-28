import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../config/logger';

export const createProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, description, craterName, latitude, longitude } = req.body;

    const insertRes = await db.query(
      `INSERT INTO projects (user_id, name, description, crater_name, latitude, longitude, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'in_progress')
       RETURNING id, name, description, crater_name, latitude, longitude, status, created_at`,
      [req.user.id, name, description, craterName, latitude, longitude]
    );

    const project = insertRes.rows[0];
    await cache.set(`project:${project.id}`, JSON.stringify(project), 3600);

    logger.info('Project created successfully', { projectId: project.id, userId: req.user.id });
    res.status(201).json({
      message: 'Project created successfully',
      projectId: project.id,
      project,
      data: project
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectsRes = await db.query(
      'SELECT id, name, description, crater_name, latitude, longitude, status, created_at FROM projects WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.user.id]
    );

    res.status(200).json({ projects: projectsRes.rows, data: projectsRes.rows });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;
    const cached = await cache.get(`project:${projectId}`);
    if (cached) {
      res.status(200).json({ project: JSON.parse(cached) });
      return;
    }

    const projectRes = await db.query(
      'SELECT id, name, description, crater_name, latitude, longitude, status, created_at FROM projects WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [projectId, req.user.id]
    );

    if (!projectRes.rowCount || projectRes.rowCount === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const project = projectRes.rows[0];
    await cache.set(`project:${projectId}`, JSON.stringify(project), 3600);

    res.status(200).json({ project });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;
    const { name, description, craterName, latitude, longitude, status } = req.body;

    const updateRes = await db.query(
      `UPDATE projects 
       SET name = COALESCE($1, name), description = COALESCE($2, description), crater_name = COALESCE($3, crater_name), 
           latitude = COALESCE($4, latitude), longitude = COALESCE($5, longitude), status = COALESCE($6, status), updated_at = NOW()
       WHERE id = $7 AND user_id = $8 AND deleted_at IS NULL
       RETURNING id, name, description, crater_name, latitude, longitude, status, updated_at`,
      [name, description, craterName, latitude, longitude, status, projectId, req.user.id]
    );

    if (!updateRes.rowCount || updateRes.rowCount === 0) {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }

    const project = updateRes.rows[0];
    await cache.set(`project:${projectId}`, JSON.stringify(project), 3600);

    logger.info('Project updated successfully', { projectId, userId: req.user.id });
    res.status(200).json({ message: 'Project updated successfully', project });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;

    const delRes = await db.query(
      'UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id',
      [projectId, req.user.id]
    );

    if (!delRes.rowCount || delRes.rowCount === 0) {
      res.status(404).json({ error: 'Project not found or unauthorized' });
      return;
    }

    await cache.set(`project:${projectId}`, '', 1); // expire cache

    logger.info('Project deleted successfully', { projectId, userId: req.user.id });
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};
