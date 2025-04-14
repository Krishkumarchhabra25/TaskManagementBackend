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
  export const registerUserController = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password } = req.body;
  
      if (!username || !email || !password) {
        res.status(400).json({ message: "Please provide username, email, and password." });
        return;
      }
  
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ message: "Invalid email format." });
        return;
      }
  
      // Password length validation
      if (password.length < 6) {
        res.status(400).json({ message: "Password must be at least 6 characters long." });
        return;
      }
  
      // Check if user already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ message: "Email already in use." });
        return;
      }
  
      const user = await registerUser(username, email, password);
      const token = generateToken(user);
  
      res.status(201).json({
        message: "User registered successfully.",
        user,
        token,
      });
    } catch (error) {
      console.error("Register Error:", error);
      res.status(500).json({ error: "Registration failed." });
    }
  };
  

  export const loginUserController = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
  
    try {
      if (!email || !password) {
        res.status(400).json({ message: "Please provide both email and password." });
        return;
      }
  
      const user = await findUserByEmail(email);
  
      if (!user) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }
  
      if (!user.password) {
        res.status(400).json({ error: "This user signed up with OAuth. Use Google or GitHub login." });
        return;
      }
  
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }
  
      const token = generateToken(user);
      res.status(200).json({
        message: "Logged in successfully.",
        user,
        token,
      });
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ error: "Login failed." });
    }
  };
  


export const googleOAuthLoginController = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.body;

  if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
  }

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
      if (tokenData.error || !tokenData.access_token) {
          throw new Error(tokenData.error || "Token exchange failed");
      }

      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userData = await userResponse.json();
      if (!userResponse.ok) {
          throw new Error(userData.error || "Failed to fetch user info");
      }

      const { email, name } = userData;
      if (!email) {
          res.status(400).json({ error: "Email not found in Google profile" });
          return;
      }

      let user = await findUserByEmail(email);
      if (!user) {
          user = await googleOAuthLogin(email, name, "google");
      }

      if (!user) {
          res.status(500).json({ error: "User creation failed" });
          return;
      }

      res.status(200).json({
          user,
          token: generateToken(user),
      });

  } catch (error: any) {
      console.error("Google OAuth Login Error:", error.message);
      res.status(500).json({ error: "Google login failed" });
  }
};



export const githubOAuthController = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.body;
  console.log("Received GitHub OAuth code:", code);


  if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Authorization code is required" });
      return;
  }

  try {
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
          },
          body: JSON.stringify({
              client_id: process.env.GITHUB_CLIENT_ID,
              client_secret: process.env.GITHUB_CLIENT_ID_SECRET,
              code,
          }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
          throw new Error(tokenData.error || "Token exchange failed");
      }

      const { access_token } = tokenData;

      const userResponse = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${access_token}` },
      });

      const userData = await userResponse.json();
      if (!userResponse.ok) {
          throw new Error(userData.message || "Failed to fetch user info");
      }

      let { login, email } = userData;

      // Fallback if GitHub doesn't return email
      if (!email) {
          const emailResponse = await fetch("https://api.github.com/user/emails", {
              headers: { Authorization: `Bearer ${access_token}` },
          });
          const emails = await emailResponse.json();
          const primary = emails.find((e: any) => e.primary && e.verified);
          email = primary?.email;
      }

      if (!email) {
          res.status(400).json({ error: "Email not found in GitHub profile" });
          return;
      }

      let user = await findUserByEmail(email);
      if (!user) {
          user = await githubOAuthLogin(login, email, "github");
      }

      if (!user) {
          res.status(500).json({ error: "User creation failed" });
          return;
      }

      res.status(200).json({ user, token: generateToken(user) });
  } catch (error: any) {
      console.error("GitHub OAuth Error:", error.message);
      res.status(500).json({ error: "GitHub login failed" });
  }
};


  export const handleSetup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { choice, organizationName } = req.body;
      const userId = req.user?.id;
  
      if (!userId) {
         res.status(401).json({ error: "Unauthorized: No user ID found" });
         return
      }
  
      console.log("Setup started for user:", userId, "Choice:", choice);
  
      await pool.query("BEGIN");
  
      // First update role if organization is chosen
      if (choice === "organization") {
        await pool.query(
          `UPDATE users SET 
            role = 'owner'::user_role, 
            setup_complete = true 
           WHERE id = $1`,
          [userId]
        );
      } else {
        await pool.query(
          `UPDATE users SET 
            setup_complete = true 
           WHERE id = $1`,
          [userId]
        );
      }
  
      console.log("User setup_complete field updated");
  
      if (choice === "organization") {
        // Create organization
        const org = await pool.query(
          `INSERT INTO organizations (name, owner_id)
           VALUES ($1, $2) RETURNING id`,
          [organizationName || "My Organization", userId]
        );
  
        // Add user as admin
        await pool.query(
          `INSERT INTO user_organizations (user_id, organization_id, role)
           VALUES ($1, $2, 'admin'::org_role)`,
          [userId, org.rows[0].id]
        );
  
        await pool.query("COMMIT");
         res.json({
          message: "Organization setup complete",
          organization: org.rows[0]
        });
        return
      }
  
      await pool.query("COMMIT");
      res.json({ message: "Personal setup complete" });
  
    } catch (error: any) {
      await pool.query("ROLLBACK");
      console.error("Setup Error:", error);
      res.status(500).json({ 
        error: "Setup failed",
        details: error.message
      });
    }
  };