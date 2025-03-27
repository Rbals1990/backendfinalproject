import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const propertiesRouter = express.Router();

// GET /properties - Haal alle properties op
propertiesRouter.get("/", async (req, res) => {
  const { location, pricePerNight, amenities } = req.query;

  try {
    const properties = await prisma.property.findMany({
      where: {
        location: location ? { contains: location } : undefined,
        pricePerNight: pricePerNight ? parseFloat(pricePerNight) : undefined,
        amenities: amenities
          ? {
              some: {
                amenity: {
                  name: {
                    contains: amenities,
                  },
                },
              },
            }
          : undefined,
      },
      include: {
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
    });
    res.json(properties);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching properties" });
  }
});

// GET /properties/:id - Haal een specifieke property op
propertiesRouter.get("/:id", async (req, res) => {
  try {
    const propertyId = req.params.id;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.status(200).json(property);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the property" });
  }
});

// POST /properties - Maak een nieuwe property aan
propertiesRouter.post("/", authenticateToken, async (req, res) => {
  const {
    title,
    description,
    location,
    pricePerNight,
    bedroomCount,
    bathRoomCount,
    maxGuestCount,
    rating,
    hostId,
  } = req.body;

  if (
    !title ||
    !description ||
    !location ||
    !pricePerNight ||
    !bedroomCount ||
    !bathRoomCount ||
    !maxGuestCount ||
    !rating ||
    !hostId
  ) {
    return res.status(400).json({
      error:
        "Missing required fields. Please provide title, description, location, pricePerNight, bedroomCount, bathRoomCount, maxGuestCount, rating, and hostId.",
    });
  }

  try {
    const property = await prisma.property.create({
      data: {
        title,
        description,
        location,
        pricePerNight,
        bedroomCount,
        bathRoomCount,
        maxGuestCount,
        rating,
        hostId,
      },
    });

    res.status(201).json(property);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the property" });
  }
});

// PUT /properties/:id - Update een bestaande property
propertiesRouter.put("/:id", authenticateToken, async (req, res) => {
  try {
    const existingProperty = await prisma.property.findUnique({
      where: { id: req.params.id },
    });

    if (!existingProperty) {
      return res.status(404).json({ error: "Property not found" });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.status(200).json(updatedProperty);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while updating property" });
  }
});

// DELETE /properties/:id - Verwijder een property
propertiesRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    await prisma.property.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the property" });
  }
});

export default propertiesRouter;
