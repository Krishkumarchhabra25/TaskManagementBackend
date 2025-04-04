import {Request , Response} from "express";
import crypto from "crypto";
import { addUserToOrganization, getAdminOrganization, getInvitationByToken, getPendingInvitationsForUser, getUserById, InsertInvitation, updateInvitationStatus } from "../models/InvitationModel";

export const inviteMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const { emails } = req.body;
        const adminId = req.user.id;
        const token = crypto.randomBytes(32).toString("hex");

        const organization = await getAdminOrganization(adminId);

        if (!organization) {
            res.status(403).json({ error: "No organization found" });
            return;
        }

        const organizationId = organization.organization_id;

        for (const email of emails) {
            await InsertInvitation(organizationId, adminId, email, token);
        }

        res.json({
            message: "Invitations sent",
            invitations: emails.map((email: string) => ({ email, token })),
        });
    } catch (error) {
        res.status(500).json({ error: "Invitation failed" });
    }
};


export const acceptInvitataion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        const invitation = await getInvitationByToken(token);
        if (!invitation) {
            res.status(400).json({ error: "Invalid or expired invitation" });
            return; // ✅ Ensure function exits after sending response
        }

        const { organization_id, email } = invitation;

        const user = await getUserById(userId);
        if (!user || user.email !== email) {
            res.status(403).json({ error: "Email mismatch" });
            return;
        }

        await addUserToOrganization(userId, organization_id);
        await updateInvitationStatus(invitation.id, "accepted");

        res.json({ message: "Joined organization successfully" });
    } catch (error) {
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