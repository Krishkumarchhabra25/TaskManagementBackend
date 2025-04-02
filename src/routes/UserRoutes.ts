import express from "express";
import { registerUserController } from "../controllers/UserController";

const router = express.Router();


router.post('/register-user' , registerUserController)

export default router