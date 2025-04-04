import express from "express";
import dotenv from "dotenv"
import cors from "cors"
import pool from "./config/db";
import createTables from "./config/createTables";
import TaskRouter from "./routes/TaskRoutes"
import UserRouter from "./routes/UserRoutes";
import InvitationRoutes from "./routes/InvitationRoutes"

dotenv.config();

const app = express();

const port = process.env.PORT || 5000;

//middlewarres
app.use(express.json());
app.use(cors());


//Routes
app.use("/api/task" ,TaskRouter )
app.use('/api/user', UserRouter )
app.use('/api/invite',InvitationRoutes  )


app.get("/" ,  async (req, res)=>{
    const result = await pool.query("SELECT current_database()");
    res.send(`the database name is ${result.rows[0].current_database}`)
});


//create table before startuing server
createTables()

app.listen(port ,()=>{
    console.log(`Server is running on port ${port}`)
})


