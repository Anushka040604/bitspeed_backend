# Bitespeed Identity Reconciliation Backend

This is a backend service built for the Bitespeed Identity Reconciliation task.

The service identifies and links customer contacts based on email and phone number using MySQL.

---

## 🚀 Live API

Base URL:

https://bitspeed-backend-tmie.onrender.com

Endpoint:

POST /identify

---

## 📌 Tech Stack

- Node.js
- Express.js
- TypeScript
- MySQL (Railway)
- Render (Deployment)

---

## 📂 API Endpoint

### POST /identify

#### Request Body

```json
{
  "email": "george@hillvalley.edu",
  "phoneNumber": "919191"
}

You must provide at least one of:

email

phoneNumber

✅ Response Format
{
  "contact": {
    "primaryContactId": 1,
    "emails": [
      "george@hillvalley.edu",
      "biffsucks@hillvalley.edu"
    ],
    "phoneNumbers": [
      "919191",
      "717171"
    ],
    "secondaryContactIds": [
      2
    ]
  }
}
🧠 Logic Overview

If no contact exists → create primary contact

If contact exists → find oldest primary

Merge multiple primaries if necessary

Create secondary contact if new information provided

Return consolidated contact response

🗄 Database Schema
CREATE TABLE contact (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phoneNumber VARCHAR(255),
  email VARCHAR(255),
  linkedId INT,
  linkPrecedence ENUM('primary','secondary') NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME
);
🛠 Local Setup

Clone repository

Install dependencies

npm install

Create .env file

DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
PORT=3000

Run development server

npm run dev
📦 Production Build
npm run build
npm start


👩‍💻 Author
Anushka Bachhav
