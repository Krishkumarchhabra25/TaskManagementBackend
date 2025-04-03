import express from "express";
import { githubOAuthController, googleOAuthLoginController, loginUserController, registerUserController } from "../controllers/UserController";

const router = express.Router();


router.post('/register-user' , registerUserController)
router.post('/login-user' , loginUserController)
router.post('/auth/google' , googleOAuthLoginController)
router.post('/auth/github', githubOAuthController)
export default router