import {Request , Response} from "express";
import { findUserByEmail, generateToken, registerUser } from "../models/UserModel";
import bcrypt from "bcrypt";

export const registerUserController = async(req:Request , res:Response):Promise<void>=>{
    try {
        const {username , email , password} = req.body;
        if(!username || !email || !password){
            res.status(400).json({
                 message:"Please provide all the fields"
            })
            return ;
        }

        const user = await registerUser(username , email ,password);
        const token = generateToken(user);
        res.status(201).json({
            message:"User created successfully",
            user,
            token
        })
    } catch (error) {
        
    }
}


export const loginUserController = async(req:Request , res:Response):Promise<void>=>{
    const {email , password} = req.body ;
    try {
        const user = await findUserByEmail(email);
        if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
             res.status(401).json({ error: "Invalid credentials" });
          }

          if (!user) {
              res.status(401).json({ error: "Invalid credentials" });
              return;
          }

          res.status(201).json({
            message:"User Logged in successfully",
             user,
             token: generateToken(user)
          })
    } catch (error) {
        res.status(500).json({
            error:"Login Failed"
        })
    }
}


export const googleOAuthLoginController = async(req:Request , res:Response):Promise<void>=>{
    try {
        
    } catch (error) {
        
    }
}