import express from "express";
import dotenv from "dotenv";
import { pool } from "./db";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bitespeed Identity Service Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  try {
    await pool.query("SELECT 1");
    console.log("Database Connected");
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error("Database connection failed");
  }
});