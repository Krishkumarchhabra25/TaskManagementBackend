import express from "express";
import { loginUserController, registerUserController } from "../controllers/UserController";

const router = express.Router();


router.post('/register-user' , registerUserController)
router.post('/login-user' , loginUserController)

export default router