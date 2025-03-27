import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const amenitiesRouter = express.Router();

// GET /amenities - Haal alle amenities op
amenitiesRouter.get("/", async (req, res) => {
  try {
    const amenities = await prisma.amenity.findMany();
    res.json(amenities);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching amenities" });
  }
});

// GET /amenities/:id - Haal een specifieke amenity op
amenitiesRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const amenity = await prisma.amenity.findUnique({
      where: { id },
    });

    if (!amenity) {
      return res.status(404).json({ error: "Amenity not found" });
    }

    res.json(amenity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while fetching amenity" });
  }
});

// POST /amenities - Maak een nieuwe amenity aan
amenitiesRouter.post("/", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Amenity name is required" });
    }

    const amenity = await prisma.amenity.create({
      data: { name },
    });

    res.status(201).json(amenity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while creating amenity" });
  }
});

// PUT /amenities/:id - Update een bestaande amenity
amenitiesRouter.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Amenity name is required" });
    }

    const existingAmenity = await prisma.amenity.findUnique({
      where: { id },
    });

    if (!existingAmenity) {
      return res.status(404).json({ error: "Amenity not found" });
    }

    const amenity = await prisma.amenity.update({
      where: { id },
      data: { name },
    });

    res.json(amenity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while updating amenity" });
  }
});

// DELETE /amenities/:id - Verwijder een amenity
amenitiesRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const amenity = await prisma.amenity.findUnique({
      where: { id: id },
    });

    if (!amenity) {
      return res.status(404).json({ error: "Amenity not found" });
    }

    await prisma.amenity.delete({
      where: { id },
    });

    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while deleting amenity" });
  }
});

export default amenitiesRouter;
