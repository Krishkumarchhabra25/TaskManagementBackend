import { Pool } from "pg";
import pool from "./db";
const createTables = async (): Promise<void> => {
    try {
      await pool.query(`  
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          provider VARCHAR(20) CHECK (provider IN ('email', 'google' , 'github')) NOT NULL DEFAULT 'email',
          provider_id TEXT,
          role VARCHAR(20) CHECK (role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
  
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(20) CHECK (status IN ('pending', 'in-progress', 'completed')) NOT NULL,
          priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')) NOT NULL,
          due_date TIMESTAMP,
          owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
          collaborators UUID[],
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
  
        CREATE TABLE IF NOT EXISTS todos (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          content TEXT NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
  
        CREATE TABLE IF NOT EXISTS comments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
  
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
  
      console.log("✅ Tables created successfully!");
    } catch (error) {
      console.error("❌ Error creating tables:", error);
    }
  };
  

  
export default createTables;