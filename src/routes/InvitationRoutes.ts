import express from "express"
import { authenticate, isOwnerOrAdmin,validateOrgId } from "../middlewares/authMiddleware";
import { handleSetup } from "../controllers/UserController";
import { acceptInvitation, getPendingInvitations, inviteMembers } from "../controllers/InvitationController";


const router = express.Router()
// Setup Flow
router.post("/setup", authenticate, handleSetup);

// Invite members to org
router.post("/organizations/:orgId/invite", authenticate, validateOrgId, isOwnerOrAdmin, inviteMembers);

// View & accept invitations
router.get("/invitations", authenticate, getPendingInvitations);
router.post("/invitations/accept", acceptInvitation);

export default router