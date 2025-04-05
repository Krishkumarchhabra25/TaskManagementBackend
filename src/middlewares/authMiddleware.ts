import { Request, Response, NextFunction } from "express";

declare global {
    namespace Express {
      interface Request {
        user?: any;
      }
    }
  }
import jwt from "jsonwebtoken";
import pool from "../config/db";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

interface OrgRequest extends Request {
  params: {
    orgId: string;
  }
}

// Helper function for UUID validation
const isValidUUID = (uuid: string): boolean => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  (async () => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const user = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);

      if (!user.rows.length) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      req.user = user.rows[0];
      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  })();
};

export const validateOrgId = (req: Request, res: Response, next: NextFunction): void => {
  let orgId = req.params.orgId;
  
  if (orgId?.startsWith(':')) {
    orgId = orgId.slice(1);
    req.params.orgId = orgId;
  }

  if (!orgId || !isValidUUID(orgId)) {
    res.status(400).json({ error: "Invalid organization ID format" });
    return;
  }
  next();
};

export const isOwnerOrAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizationId = req.params.orgId;

    const orgResult = await pool.query(
      'SELECT owner_id FROM organizations WHERE id = $1',
      [organizationId]
    );
    
    if (orgResult.rows.length === 0) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    if (orgResult.rows[0].owner_id === req.user.id) {
      next();
      return;
    }

    const membershipResult = await pool.query(
      `SELECT role FROM user_organizations 
       WHERE user_id = $1 AND organization_id = $2`,
      [req.user.id, organizationId]
    );

    if (membershipResult.rows[0]?.role === 'admin') {
      next();
      return;
    }

    res.status(403).json({ error: "Owner/Admin access required" });
  } catch (error: any) {
    if (error.code === '22P02') {
      res.status(400).json({ error: "Invalid organization ID" });
      return;
    }
    console.error('Middleware error:', error);
    res.status(500).json({ error: "Server error" });
  }
};
// Simplified versions of other middlewares
export const isOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await pool.query(
      'SELECT owner_id FROM organizations WHERE id = $1',
      [req.params.orgId]
    );
    if (org.rows[0]?.owner_id !== req.user.id) {
      return res.status(403).json({ error: "Owner privileges required" });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const isOrgAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const membership = await pool.query(
      `SELECT role FROM user_organizations 
       WHERE user_id = $1 AND organization_id = $2`,
      [req.user.id, req.params.orgId]
    );
    if (membership.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const generateInvitationToken = (
  email: string,
  organizationId: string,
  invitationToken: string
): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }

  return jwt.sign(
    {
      email,
      organizationId,
      invitationToken,
      role: "invited"
    },
    process.env.JWT_SECRET,
    { expiresIn: "3d" }
  );
};
