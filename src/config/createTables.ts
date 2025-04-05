import { Pool } from "pg";
import pool from "./db";


export const createEnums = async (): Promise<void> => {
  try {
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_provider') THEN
          CREATE TYPE auth_provider AS ENUM ('email', 'google', 'github');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('user', 'owner');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
          CREATE TYPE org_role AS ENUM ('admin', 'member');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
          CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired');
        END IF;
      END $$;
    `);
    console.log("✅ ENUM types created successfully!");
  } catch (error) {
    console.error("❌ Error creating ENUM types:", error);
  }
};

const createTables = async (): Promise<void> => {
    try {
      await createEnums();
      await pool.query(`  
     
          CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password TEXT,
        provider auth_provider NOT NULL DEFAULT 'email',
        provider_id TEXT,
        role user_role NOT NULL DEFAULT 'user',
        setup_complete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

         CREATE TABLE IF NOT EXISTS organizations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

       CREATE TABLE IF NOT EXISTS user_organizations (
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        role org_role NOT NULL DEFAULT 'member',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, organization_id)
      );

      CREATE TABLE IF NOT EXISTS invitations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(100) NOT NULL,
        token TEXT NOT NULL UNIQUE,
        status invitation_status DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
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