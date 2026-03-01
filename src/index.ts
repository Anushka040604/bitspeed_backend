import express from "express";
import dotenv from "dotenv";
import { pool } from "./db";
import contactRoutes from "./routes/contact";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ Keep only this one
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Bitespeed Identity Reconciliation</title>
      </head>
      <body style="font-family: Arial; padding: 40px;">
        <h2>Identity Reconciliation</h2>
        <form id="form">
          <input type="text" id="email" placeholder="Email" /><br/><br/>
          <input type="text" id="phone" placeholder="Phone Number" /><br/><br/>
          <button type="submit">Identify</button>
        </form>

        <h3>Response:</h3>
        <pre id="result"></pre>

        <script>
          const form = document.getElementById("form");
          form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("email").value;
            const phoneNumber = document.getElementById("phone").value;

            const res = await fetch("/identify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, phoneNumber })
            });

            const data = await res.json();
            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
          });
        </script>
      </body>
    </html>
  `);
});

app.use("/", contactRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  try {
    await pool.query("SELECT 1");
    console.log("Database Connected");
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error("Database connection failed", err);
  }
});