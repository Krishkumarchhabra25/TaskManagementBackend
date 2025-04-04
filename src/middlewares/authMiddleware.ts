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

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const user = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
  
      if (!user.rows.length) {
        res.status(401).json({ message: "User not found" });
        return;
      }
  
      req.user = user.rows[0];
      next(); // ✅ Continue execution
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  };
  
  

  export const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.id;
  
      const result = await pool.query(
        `SELECT role FROM user_organizations WHERE user_id = $1 AND organization_id = $2`,
        [userId, organizationId]
    );
    
    
  
      if (!result.rows.length || result.rows[0].role !== 'admin') {
        res.status(403).json({ message: "Admin access required" });
        return;
      }
  
      next(); // ✅ Continue execution
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
  