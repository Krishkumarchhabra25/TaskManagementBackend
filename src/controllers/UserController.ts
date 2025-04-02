import {Request , Response} from "express";
import { generateToken, registerUser } from "../models/UserModel";


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