import {Request , Response} from "express";
import { findUserByEmail, generateToken, githubOAuthLogin, googleOAuthLogin, registerUser } from "../models/UserModel";
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


export const googleOAuthLoginController = async (req: Request, res: Response): Promise<void> => {
    const { code } = req.body;
    try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: process.env.GOOGLE_REDIRECT_URI
            }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error);

        const { access_token } = tokenData;

        const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const userData = await userResponse.json();
        if (!userResponse.ok) throw new Error(userData.error);

        const { email, name } = userData;

        let user = await findUserByEmail(email);
        if (!user) {
            user = await googleOAuthLogin(email, name, "google");
        }

        if (!user) {
            res.status(500).json({ error: "User creation failed" });
            return;
        }

        res.json({
            user,
            token: generateToken(user),
        });

    } catch (error) {
        console.error("Google OAuth Login Error:", error);
        res.status(500).json({ error: "Google login failed" });
    }
};



export const githubOAuthController = async (req: Request, res: Response):Promise<void> => {
    const { code } = req.query;
  
    try {
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
  
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenData.error);
  
      const { access_token } = tokenData;
  
      const userResponse = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
  
      const userData = await userResponse.json();
      if (!userResponse.ok) throw new Error(userData.error);
  
      const { login, email } = userData;
  
      let user = await findUserByEmail(email);
      if (!user) {
        user = await githubOAuthLogin(login, email, "github");
      }
  
      res.json({ user, token: generateToken(user) });
    } catch (error) {
      console.error("GitHub OAuth Error:", error);
      res.status(500).json({ error: "GitHub login failed" });
    }
  };