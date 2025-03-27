import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";
import * as Sentry from "@sentry/node";

//import Routers
import usersRouter from "./routes/users.js";
import hostsRouter from "./routes/hosts.js";
import propertiesRouter from "./routes/properties.js";
import bookingsRouter from "./routes/bookings.js";
import reviewsRouter from "./routes/reviews.js";
import amenitiesRouter from "./routes/amenities.js";
import loginRouter from "./routes/login.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
const prisma = new PrismaClient();

// Initialiseer Sentry
Sentry.init({ dsn: process.env.SENTRY_DSN });

app.use(express.json());

// Log request duration middleware
const logRequestDuration = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${duration}ms`);
  });

  next();
};

app.use(logRequestDuration);

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.use("/login", loginRouter);
app.use("/users", usersRouter);
app.use("/hosts", hostsRouter);
app.use("/properties", propertiesRouter);
app.use("/bookings", bookingsRouter);
app.use("/reviews", reviewsRouter);
app.use("/amenities", amenitiesRouter);

// Sentry Error test route
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

// Algemene foutafhandelingsmiddleware
app.use((err, req, res, next) => {
  console.error(err);
  Sentry.captureException(err); // Stuur de error naar Sentry

  // Verstuur een algemene foutmelding naar de client
  res.status(500).json({
    error: "An error occurred on the server, please double-check your request!",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
