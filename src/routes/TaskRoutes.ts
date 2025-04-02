import express from "express"
import { createTask, deleteTask, getAllTasks, getTaskById, updateTask } from "../controllers/TaskController";

const router = express.Router();

router.post('/create-task' , createTask);
router.get('/getall-task' , getAllTasks);
router.put('/update-task' , updateTask);
router.delete('/delete-task' , deleteTask);
router.get('/getTask-byId/:id' , getTaskById)

export default router