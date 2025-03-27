import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const hostsRouter = express.Router();

// GET /hosts - Haal alle hosts op
hostsRouter.get("/", async (req, res) => {
  const { name } = req.query;

  try {
    const hosts = name
      ? await prisma.host.findMany({
          where: {
            name: {
              contains: name,
            },
          },
        })
      : await prisma.host.findMany();
    res.json(hosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /hosts/:id - Haal een specifieke host op
hostsRouter.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const host = await prisma.host.findUnique({
      where: {
        id: id,
      },
    });

    if (!host) {
      return res.status(404).json({ error: "Host not found" });
    }

    res.json(host);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /hosts - Maak een nieuwe host aan
hostsRouter.post("/", authenticateToken, async (req, res) => {
  const {
    username,
    password,
    name,
    email,
    phoneNumber,
    profilePicture,
    aboutMe,
  } = req.body;

  if (
    !username ||
    !password ||
    !name ||
    !email ||
    !phoneNumber ||
    !profilePicture ||
    !aboutMe
  ) {
    return res.status(400).json({
      error:
        "Missing required fields. Please provide username, password, name, email, phoneNumber, profilePicture, and aboutMe.",
    });
  }

  try {
    const host = await prisma.host.create({
      data: {
        username,
        password,
        name,
        email,
        phoneNumber,
        profilePicture,
        aboutMe,
      },
    });

    res.status(201).json(host);
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(400).json({
        error:
          "Username or email already exists. Please choose a different one.",
      });
    }

    res
      .status(500)
      .json({ error: "An error occurred while creating the host" });
  }
});

// PUT /hosts/:id - Update een bestaande host
hostsRouter.put("/:id", authenticateToken, async (req, res) => {
  const { username, name, email, phoneNumber, profilePicture, aboutMe } =
    req.body;

  if (
    !username ||
    !name ||
    !email ||
    !phoneNumber ||
    !profilePicture ||
    !aboutMe
  ) {
    return res.status(400).json({
      error:
        "Missing required fields. Please provide username, name, email, phoneNumber, profilePicture, and aboutMe for update.",
    });
  }

  try {
    const existingHost = await prisma.host.findUnique({
      where: { id: req.params.id },
    });

    if (!existingHost) {
      return res.status(404).json({ error: "Host not found" });
    }

    const updatedHost = await prisma.host.update({
      where: { id: req.params.id },
      data: { username, name, email, phoneNumber, profilePicture, aboutMe },
    });

    res.status(200).json(updatedHost);
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(400).json({
        error:
          "Username or email already exists. Please choose a different one.",
      });
    }

    res
      .status(500)
      .json({ error: "An error occurred while updating the host" });
  }
});

// DELETE /hosts/:id - Verwijder een host
hostsRouter.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const host = await prisma.host.findUnique({
      where: { id: id },
    });

    if (!host) {
      return res.status(404).json({ error: "Host not found" });
    }

    // Verwijder alle gekoppelde properties
    await prisma.property.updateMany({
      where: { hostId: id },
      data: { hostId: null },
    });

    await prisma.host.delete({ where: { id: id } });

    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

export default hostsRouter;
