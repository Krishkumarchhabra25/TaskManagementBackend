import express from "express"
import { authenticate, isAdmin } from "../middlewares/authMiddleware";
import { handleSetup } from "../controllers/UserController";
import { acceptInvitataion, getPendingInvitations, inviteMember } from "../controllers/InvitationController";


const router = express.Router()
// Setup Flow
router.post("/setup", authenticate, handleSetup);
router.post("/invite", authenticate, isAdmin, inviteMember);
router.get("/invitations", authenticate, getPendingInvitations);
router.post("/invitations/accept", authenticate, acceptInvitataion);

export default router