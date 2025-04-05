import {Request , Response} from "express";
import crypto from "crypto";
import { addUserToOrganization, getAdminOrganization, getInvitationByToken, getPendingInvitationsForUser, getUserById, InsertInvitation, updateInvitationStatus } from "../models/InvitationModel";
import pool from "../config/db";
import { sendInvitationEmail } from "../utils/email";
import { generateInvitationToken } from "../middlewares/authMiddleware";
import jwt from "jsonwebtoken"
import { generateToken } from "../models/UserModel";


export const inviteMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[INVITE] Starting invitation process...');
    const { emails } = req.body;
    const adminId = req.user.id;
    const organizationId = req.params.orgId;

    if (!emails?.length || !Array.isArray(emails)) {
      res.status(400).json({ error: "Valid email list required" });
      return;
    }

    const validEmails = emails.filter(email =>
      typeof email === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );

    if (validEmails.length === 0) {
      res.status(400).json({ error: "No valid emails provided" });
      return;
    }

    const invitations = [];
    const failedEmails = [];

    for (const email of validEmails) {
      try {
        const invitationToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

        await pool.query(
          `INSERT INTO invitations 
            (organization_id, inviter_id, email, token, expires_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [organizationId, adminId, email, invitationToken, expiresAt]
        );

        // Generate JWT for invitation
        const invitationJwt = jwt.sign(
          {
            email,
            organizationId,
            invitationToken,
            role: "invited"
          },
          process.env.JWT_SECRET!,
          { expiresIn: "3d" }
        );

        await sendInvitationEmail(email, invitationToken);

        invitations.push({
          email,
          invitationToken,
          invitationJwt
        });

        console.log(`[INVITE] Success: ${email}`);
      } catch (error) {
        failedEmails.push(email);
        console.error(`[INVITE ERROR] Failed for ${email}:`, error);

        await pool.query(
          'DELETE FROM invitations WHERE email = $1',
          [email]
        );
      }
    }

    res.status(200).json({
      success: invitations.length,
      failed: failedEmails.length,
      invitations,
      failedEmails
    });

  } catch (error) {
    console.error('[INVITE FATAL ERROR]:', error);
    res.status(500).json({
      error: "Invitation processing failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
export const acceptInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      email: string;
      organizationId: string;
      invitationToken: string;
    };

    // Fetch invitation with inviter details
    const invitation = await pool.query(
      `SELECT invitations.*, user_organizations.role as inviter_role 
       FROM invitations
       LEFT JOIN user_organizations ON invitations.inviter_id = user_organizations.user_id 
         AND invitations.organization_id = user_organizations.organization_id
       WHERE invitations.token = $1 
         AND invitations.email = $2 
         AND invitations.organization_id = $3 
         AND invitations.status = 'pending' 
         AND invitations.expires_at > NOW()`,
      [decoded.invitationToken, decoded.email, decoded.organizationId]
    );

    if (!invitation.rows.length) {
      res.status(400).json({ error: "Invalid or expired invitation" });
      return;
    }

    // Verify inviter has admin privileges
    if (!invitation.rows[0].inviter_role || invitation.rows[0].inviter_role !== 'admin') {
      res.status(403).json({ error: "Inviter doesn't have permission to add members" });
      return;
    }

    // Check if user exists
    const user = await pool.query(
      "SELECT id, role FROM users WHERE email = $1",
      [decoded.email]
    );

    if (!user.rows.length) {
      res.status(403).json({ error: "Email mismatch. Please register first." });
      return;
    }

    const userId = user.rows[0].id;
    const currentRole = user.rows[0].role;

    // Check if user is already in the organization
    const existingMembership = await pool.query(
      `SELECT role FROM user_organizations 
       WHERE user_id = $1 AND organization_id = $2`,
      [userId, decoded.organizationId]
    );

    if (existingMembership.rows.length) {
      res.status(400).json({ error: "User already belongs to this organization" });
      return;
    }

    // Add user to organization with member role (organization-specific role)
    await pool.query(
      `INSERT INTO user_organizations (user_id, organization_id, role)
       VALUES ($1, $2, 'member')`,
      [userId, decoded.organizationId]
    );

    await pool.query(
      `UPDATE users SET role = 'member' WHERE id = $1`,
      [userId]
    );
    // Update invitation status
    await pool.query(
      `UPDATE invitations SET status = 'accepted' WHERE id = $1`,
      [invitation.rows[0].id]
    );

    // Get updated user data
    const updatedUser = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );


    const authToken = generateToken(updatedUser.rows[0]);

    res.status(200).json({
      message: "Joined organization successfully as member",
      organizationId: decoded.organizationId,
      user: updatedUser.rows[0], // Will show their global role (unchanged)
      organization_role: 'member', // Explicitly show their org role
      token: authToken
    });

  } catch (error) {
    console.error("Acceptance error:", error);
    res.status(500).json({ error: "Invitation acceptance failed" });
  }
};
export const getPendingInvitations = async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const invitations = await getPendingInvitationsForUser(userId);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  };