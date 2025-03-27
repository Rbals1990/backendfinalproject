import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const bookingsRouter = express.Router();

// GET /bookings - Haal alle boekingen op
bookingsRouter.get("/", async (req, res) => {
  const { userId } = req.query;

  try {
    const bookings = await prisma.booking.findMany({
      where: userId ? { userId } : {},
      include: {
        property: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching bookings" });
  }
});

// GET /bookings/:id - Haal een specifieke boeking op
bookingsRouter.get("/:id", async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /bookings - Maak een nieuwe boeking aan
bookingsRouter.post("/", authenticateToken, async (req, res) => {
  const {
    userId,
    propertyId,
    checkinDate,
    checkoutDate,
    numberOfGuests,
    totalPrice,
    bookingStatus,
  } = req.body;

  if (
    !userId ||
    !propertyId ||
    !checkinDate ||
    !checkoutDate ||
    !numberOfGuests ||
    !totalPrice ||
    !bookingStatus
  ) {
    return res.status(400).json({
      error:
        "Missing required fields. Please provide userId, propertyId, checkinDate, checkoutDate, numberOfGuests, totalPrice, and bookingStatus.",
    });
  }

  try {
    const booking = await prisma.booking.create({ data: req.body });
    res.status(201).json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while creating booking" });
  }
});

// PUT /bookings/:id - Update een bestaande boeking
bookingsRouter.put("/:id", authenticateToken, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while updating booking" });
  }
});

// DELETE /bookings/:id - Verwijder een boeking
bookingsRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    await prisma.booking.delete({ where: { id: req.params.id } });
    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while deleting booking" });
  }
});

export default bookingsRouter;
