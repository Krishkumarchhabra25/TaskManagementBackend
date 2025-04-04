import bcrypt from "bcrypt";
import pool from "../config/db";
import jwt from "jsonwebtoken"

interface User {
    id: string;
    username: string;
    email: string;
    password: string;
    provider: "email" | "google" | "github";
    provider_id?: string | null;
    role: "admin" | "user";
    created_at?: Date;
    updated_at?: Date;
}


export const findUserByEmail = async (email: string): Promise<User | null> => {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return result.rows.length ? result.rows[0] : null;
  };

  export const findUserById = async (id: string): Promise<User | null> => {
    try {
        const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
        return result.rows.length ? result.rows[0] : null;
    } catch (error) {
        console.error("Error finding user by ID:", error);
        throw new Error("Database query failed");
    }
};


export const registerUser = async(username:string , email:string , password:string):Promise<any>=>{
    const hashedPassword = await bcrypt.hash(password , 10);

    const result  = await pool.query(`
        INSERT INTO users (username , email , password , provider , role) VALUES ($1 , $2 , $3 , 'email' , 'user' ) RETURNING *`,
    [username , email , hashedPassword]
    );
    return result.rows[0];
}

export const markSetupComplete = async (userId:string):Promise<void>=>{
    try {
        await pool.query(
            `UPDATE users SET setup_complete = true WHERE id = $1`,
            [userId]
        );
        
    } catch (error) {
        console.log("Error marking setup complete:" , error);
        throw new Error("Database query failed");
    }
}

export const loginUser = async(email:string , password:string):Promise<any | null>=>{

    try {
        const result = await pool.query(`SELECT * FROM users WHERE email = $1` , [email]);
        if(result.rows.length === 0){
            return "User not found";
        }
    
        const user = result.rows[0];
        if (!user.password) {
            return "OAuth user - please log in with Google or GitHub";
        }
        
        const passwordMatch = await bcrypt.compare(password , user.password);
        if(!passwordMatch){
            return "Incorrect password"; 
        }
    
        return user ;
    } catch (error) {
        console.error("Error logging in user:", error);
        throw new Error("Login failed");
    }

  
}


export const googleOAuthLogin = async (email: string, username: string, providerId: string) => {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (result.rows.length > 0) return result.rows[0];

    const newUser = await pool.query(
        `INSERT INTO users (username, email, provider, provider_id, role) VALUES ($1, $2, 'google', $3, 'user') RETURNING *`,
        [username, email, providerId]
    );

    return newUser.rows[0];
};

export const githubOAuthLogin = async (email: string, username: string, githubId: string): Promise<User> => {
    let user = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  
    if (user.rowCount === 0) {
      const newUser = await pool.query(
        `INSERT INTO users (username, email, provider, provider_id, role) VALUES ($1, $2, 'github', $3, 'user') RETURNING *`,
        [username, email, githubId]
      );
      return newUser.rows[0];
    }
  
    return user.rows[0];
  };
  

export const generateToken = (user: User): string => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not set in environment variables");
    }
    
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};