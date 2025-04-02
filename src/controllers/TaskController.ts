import { createTaskServices, deleteTaskService, getAllTaskServices, getTaskByIdServices, updateTaskService } from "../models/TaskModel";
import { Request, Response } from "express";


interface CreateTaskRequest extends Request {
    body: {
        title: string;
        description: string;
        status: "pending" | "in-progress" | "completed";
        priority: "low" | "medium" | "high";
        due_date: Date | null;
        owner_id: string;
    };
}

export const createTask = async (req: CreateTaskRequest, res: Response): Promise<void> => {
    try {
        const { title, description, status, priority, due_date, owner_id } = req.body;
        const newTask = await createTaskServices(title, description, status, priority, due_date, owner_id);
        res.status(201).json({
            message:"task created successfully",
            newTask
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to create task", error });
    }
};

export const getAllTasks = async (req: Request, res: Response): Promise<void> => {
    try {
        const tasks = await getAllTaskServices();
        res.status(200).json({
            message:"Fetched successfully",
            tasks
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching tasks", error });
    }
};

export const getTaskById = async(req:Request , res:Response):Promise<void>=>{
    try {
        const {id} = req.params;
        const task = await getTaskByIdServices(id);
        if(!task){
            res.status(404).json({
                message:"Task not found"
            })
        }
        res.status(200).json({
            message:"Task found successfully",
            task
        })
    } catch (error) {
        res.status(500).json({
            message:"Error fetching task by ID",
            error
        })
    }
}


export const updateTask = async(req:Request , res:Response):Promise<void>=>{
    try {
        const {id} = req.params;
        const {title , description , status , priority , due_date} = req.body;
        const updatedTask = await  updateTaskService(id , title , description , status , priority , due_date);
        if(!updatedTask){
            res.status(400).json({
                message:"Task not found"
            })
        }
        res.status(200).json({
            message:"Task Updated successfully",
            updateTask
        })

    } catch (error) {
         res.status(500).json({
            message:"Error fetching task by ID",
            error
        })
    }
}


export const deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deletedTask = await deleteTaskService(id);
        if (!deletedTask) {
            res.status(404).json({ message: "Task not found" });
            return;
        }
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete task", error });
    }
};
