import pg from "pg"
import dotenv from "dotenv"

dotenv.config();


console.log("DB config..." , {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD ? "********" : "MISSING"
})


const {Pool} = pg;


const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined
});

console.log("Database Name:", process.env.DB_DATABASE);


pool.on("connect", () => {
    console.log("Connection pool established with Database");
});

export default pool;