import pool from "../config/db"


export const getAllTaskServices = async():Promise<any[]>=>{
    try {
        const result = await pool.query('SELECT * FROM tasks');
        return result.rows;
    } catch (error) {
        console.error("Error fetching tasks:", error);
        throw error;
    }
  
}

export const getTaskByIdServices = async(id:string):Promise<any | null>=>{
   try {
    const result = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
    return result.rows[0] || null;

   } catch (error) {
      console.log("Error fetching task by Id"  , error);
      throw error;
   }
   
}

export const createTaskServices = async (
     title:string,
     description:string,
     status: 'pending' | 'in-progress' | 'completed' ,
     priority: 'low' | 'medium' | 'high',
     due_date: Date | null,
     owner_id: string
):Promise<any>=>{
    try {
        const result = await pool.query(
            `INSERT INTO tasks (title, description, status, priority, due_date, owner_id) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, description, status, priority, due_date, owner_id]
          );
          return result.rows[0];
    } catch (error) {
        console.log("Failed to create Task"  , error);
        throw error;
    }
}

export const updateTaskService = async (
    id: string,
    title: string,
    description: string,
    status: "pending" | "in-progress" | "completed",
    priority: "low" | "medium" | "high",
    due_date: Date | null
  ): Promise<any> => {
     try {
        const result = await pool.query(
            `UPDATE tasks 
             SET title = $1, description = $2, status = $3, priority = $4, due_date = $5 
             WHERE id = $6 RETURNING *`,
            [title, description, status, priority, due_date, id]
          );
          return result.rows[0];
     } catch (error) {
        console.log("Failed to create Task"  , error);
        throw error;
     }
  };

  export const deleteTaskService = async (id: string): Promise<any> => {
     try {
    const result = await pool.query("DELETE FROM tasks WHERE id = $1 RETURNING *", [id]);
    return result.rows[0];
     } catch (error) {
        console.log("Failed to create Task"  , error);
        throw error;
     }
  };
  