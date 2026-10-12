# Housing Sales & Buyer Management System

**Course:** Web Technology Final Assessment (Case Study C)
**Student Name:Jayden Liew]
**Student ID:QIU-202507008364

## 📖 Project Overview
This is a full-stack web application built for the housing sales domain. It serves as a production-ready intermediary backend service and user interface, enabling secure property management, buyer reservations, and external API integration. 

The project is divided into four core phases as required by the final assessment:
- **Task 1:** Web API Architecture & Implementation (Integration of 3 external APIs)
- **Task 2:** Database Integration & Feature Extension (MySQL, CRUD, Transactions)
- **Task 3:** Web Application Security Implementation (JWT, bcrypt, SQL Injection prevention, Rate Limiting)
- **Task 4:** Project Deployment (Git, Environment Variables, Cloud Hosting)

## 🛠️ Technology Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL (via `mysql2`)
- **Security:** `helmet`, `express-rate-limit`, `bcryptjs`, `jsonwebtoken`
- **Deployment:** Render / Railway (Connected to GitHub)

## 📁 Project Structure
```text
├── public/                 # Frontend assets (HTML, CSS, Client JS)
├── lib/                    # Backend utilities (Errors, Validation)
├── services/               # Business logic (Reservations)
├── migrations/             # Database migration scripts
├── app.js                  # Express application configuration
├── server.js               # Application entry point
├── config.js               # Environment configuration loader
├── database.js             # MySQL connection pool
├── authMiddleware.js       # JWT authentication middleware
├── routes.js               # Authentication & User routes
├── propertyRoutes.js       # Property & Reservation routes
├── database.sql            # Core database schema
├── house.sql               # Sample data
└── .env.example            # Environment variables template
