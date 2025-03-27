import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const reviewsRouter = express.Router();

// GET /reviews - Haal reviews op met optionele filters voor userId en propertyId
reviewsRouter.get("/", async (req, res) => {
  const { userId, propertyId } = req.query;
  try {
    const reviews = await prisma.review.findMany({
      where: {
        userId: userId ? userId : undefined,
        propertyId: propertyId ? propertyId : undefined,
      },
      include: {
        user: { select: { id: true, name: true } },
        property: { select: { id: true, title: true } },
      },
    });
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while fetching reviews" });
  }
});

// GET /reviews/:id - Haal een specifieke review op
reviewsRouter.get("/:id", async (req, res) => {
  try {
    const review = await prisma.review.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /reviews - Maak een nieuwe review aan
reviewsRouter.post("/", authenticateToken, async (req, res) => {
  const { userId, propertyId, rating, comment } = req.body;

  if (!userId || !propertyId || !rating || !comment) {
    return res.status(400).json({
      error:
        "Missing required fields. Please provide userId, propertyId, rating, and comment.",
    });
  }

  try {
    const review = await prisma.review.create({ data: req.body });
    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while creating review" });
  }
});

// PUT /reviews/:id - Update een bestaande review
reviewsRouter.put("/:id", authenticateToken, async (req, res) => {
  try {
    const existingReview = await prisma.review.findUnique({
      where: { id: req.params.id },
    });

    if (!existingReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while updating review" });
  }
});

// DELETE /reviews/:id - Verwijder een review
reviewsRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const existingReview = await prisma.review.findUnique({
      where: { id: req.params.id },
    });

    if (!existingReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    await prisma.review.delete({ where: { id: req.params.id } });
    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while deleting review" });
  }
});

export default reviewsRouter;
