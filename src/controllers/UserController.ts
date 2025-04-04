import {Request , Response} from "express";
import { findUserByEmail, generateToken, githubOAuthLogin, googleOAuthLogin, markSetupComplete, registerUser } from "../models/UserModel";
import bcrypt from "bcrypt";
import pool from "../config/db";
declare global {
    namespace Express {
      interface Request {
        user?: any;
      }
    }
  }
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


  export const handleSetup = async(req:Request , res:Response):Promise<void>=>{
    try {
        const {choice , organizationName} = req.body;
        const userId = req.user?.id

        if(!userId){
            res.status(401).json({
                error: "Unauthorized: User Id is missing"
            });
            return 
        }

        if (!choice || !["organization", "personal"].includes(choice)) {
            res.status(400).json({ error: "Invalid setup choice. Choose 'organization' or 'personal'." });
            return;
          }
          await pool.query("BEGIN");

          await markSetupComplete(userId);

          if(choice === "organization"){

            const orgResult = await pool.query(
                `INSERT INTO organizations (name, created_by)
                 VALUES ($1, $2) RETURNING id, name`,
                [organizationName || "My Organization", userId]
            );
            

            const orgId = orgResult.rows[0].id;
            
            await pool.query(
                `INSERT INTO user_organizations (user_id , organization_id , role) VALUES ($1 , $2 , 'admin')` ,
                [userId , orgId]
            )

            await pool.query("COMMIT");

            res.status(201).json({
               message:"Organization setup complete",
               organization: orgResult.rows[0]
            })
             return ;
          }

          res.status(200).json({
            message: "personal setup complete"
          })

    } catch (error:any) {
        await pool.query("ROLLBACK");
        console.error("❌ Setup Error:", error);
        res.status(500).json({ error: "Setup failed. Please try again.", details: error.message });
    }
    
  }