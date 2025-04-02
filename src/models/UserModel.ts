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


export const registerUser = async(username:string , email:string , password:string):Promise<any>=>{
    const hashedPassword = await bcrypt.hash(password , 10);

    const result  = await pool.query(`
        INSERT INTO users (username , email , password , provider , role) VALUES ($1 , $2 , $3 , 'email' , 'user' ) RETURNING *`,
    [username , email , hashedPassword]
    );
    return result.rows[0];
}

export const loginUser = async(email:string , password:string):Promise<any | null>=>{
    const result = await pool.query(`SELECT * FROM users WHERE email = $1` , [email]);
    if(result.rows.length === 0){
        return null;
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password , user.password);
    if(!passwordMatch){
        return null 
    }

    return user ;
  
}


export const googleOAuthLogin = async(email:string , username:string , googleId:string):Promise<any>=>{
    const result = await pool.query(`SELECT * FROM users WHERE email = $1` , [email]);

    if(result.rows.length > 0) return result.rows[0];

    const newUser = await pool.query(
        `INSERT INTO users (username , email , provider , provider_id , role) VALUES ($1 , $2 , 'google' , $3 , 'user') RETURNING *`,
        [username , email , googleId]
    );

    return newUser.rows[0];
}

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