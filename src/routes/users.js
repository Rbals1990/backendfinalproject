import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const router = express.Router();

// Get all users
router.get("/", async (req, res) => {
  const { username, email } = req.query;

  try {
    const users = await prisma.user.findMany({
      where: {
        username: username ? { equals: username } : undefined,
        email: email ? { equals: email } : undefined,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phoneNumber: true,
        profilePicture: true,
        bookings: true,
        reviews: true,
      },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while fetching users" });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phoneNumber: true,
        profilePicture: true,
        bookings: true,
        reviews: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the user" });
  }
});

// Create new user
router.post("/", authenticateToken, async (req, res) => {
  const { username, password, name, email, phoneNumber, profilePicture } =
    req.body;

  if (
    !username ||
    !password ||
    !name ||
    !email ||
    !phoneNumber ||
    !profilePicture
  ) {
    return res.status(400).json({
      error:
        "Missing required fields. Please provide username, password, name, email, phoneNumber, and profilePicture.",
    });
  }

  try {
    const user = await prisma.user.create({
      data: { username, password, name, email, phoneNumber, profilePicture },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);

    // Prisma error handling (e.g. username or email already exists)
    if (error.code === "P2002") {
      return res.status(400).json({
        error:
          "Username or email already exists. Please choose a different one.",
      });
    }

    res
      .status(500)
      .json({ error: "An error occurred while creating the user" });
  }
});

// Update user
router.put("/:id", authenticateToken, async (req, res) => {
  const { username, name, email, phoneNumber, profilePicture } = req.body;

  if (!username || !name || !email || !phoneNumber || !profilePicture) {
    return res.status(400).json({
      error:
        "Missing required fields. Please provide username, name, email, phoneNumber, and profilePicture for update.",
    });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { username, name, email, phoneNumber, profilePicture },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);

    // Prisma error handling, e.g. unique field conflicts
    if (error.code === "P2002") {
      return res.status(400).json({
        error:
          "Username or email already exists. Please choose a different one.",
      });
    }
    res
      .status(500)
      .json({ error: "An error occurred while updating the user" });
  }
});

// Delete user
router.delete("/:id", authenticateToken, async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete related reviews and bookings first
    await prisma.review.deleteMany({
      where: { userId: userId },
    });

    await prisma.booking.deleteMany({
      where: { userId: userId },
    });

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while deleting user" });
  }
});

export default router;
