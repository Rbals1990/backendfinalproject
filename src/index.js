import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";
import * as Sentry from "@sentry/node";

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

// Middleware JWT Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res
      .status(401)
      .json({ error: "Access denied. Token not provided." });
  }

  let token = authHeader;

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Verified token payload:", verified); // Debugging log
    req.user = verified;
    next();
  } catch (err) {
    console.error("Error verifying token:", err);
    res.status(403).json({ error: "Invalid token" });
  }
};

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(req.body);
    if (!username || !password) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// USERS CRUD
app.get("/users", async (req, res) => {
  const { username, email } = req.query;

  try {
    const users = await prisma.user.findMany({
      where: {
        username: username ? { equals: username } : undefined,
        email: email ? { equals: email } : undefined,
      },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while fetching users" });
  }
});

app.get("/users/:id", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});

app.post("/users", authenticateToken, async (req, res) => {
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

    // Prisma foutafhandeling (bijvoorbeeld wanneer username of email al bestaat)
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

app.put("/users/:id", authenticateToken, async (req, res) => {
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

    // Prisma foutafhandeling, bijvoorbeeld bij unieke veldconflicten
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

app.delete("/users/:id", authenticateToken, async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verwijder eerst de gerelateerde reviews en bookings
    await prisma.review.deleteMany({
      where: { userId: userId },
    });

    await prisma.booking.deleteMany({
      where: { userId: userId },
    });

    // Verwijder de gebruiker
    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while deleting user" });
  }
});

// HOSTS CRUD
app.get("/hosts", async (req, res) => {
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

app.get("/hosts/:id", async (req, res) => {
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

app.post("/hosts", authenticateToken, async (req, res) => {
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

    // Prisma foutafhandeling (bijvoorbeeld wanneer username of email al bestaat)
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

app.put("/hosts/:id", authenticateToken, async (req, res) => {
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

    // Prisma foutafhandeling, bijvoorbeeld bij unieke veldconflicten
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

app.delete("/hosts/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const host = await prisma.host.findUnique({
      where: { id: id },
    });

    if (!host) {
      return res.status(404).json({ error: "Host not found" });
    }

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

// PROPERTIES CRUD
app.get("/properties", async (req, res) => {
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

app.get("/properties/:id", async (req, res) => {
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

app.post("/properties", authenticateToken, async (req, res) => {
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

app.put("/properties/:id", authenticateToken, async (req, res) => {
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

app.delete("/properties/:id", authenticateToken, async (req, res) => {
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

// BOOKINGS CRUD
app.get("/bookings", async (req, res) => {
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

app.get("/bookings/:id", async (req, res) => {
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

app.post("/bookings", authenticateToken, async (req, res) => {
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

app.put("/bookings/:id", authenticateToken, async (req, res) => {
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

app.delete("/bookings/:id", authenticateToken, async (req, res) => {
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

// REVIEWS CRUD
app.get("/reviews", async (req, res) => {
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

app.get("/reviews/:id", async (req, res) => {
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

app.post("/reviews", authenticateToken, async (req, res) => {
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

app.put("/reviews/:id", authenticateToken, async (req, res) => {
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

app.delete("/reviews/:id", authenticateToken, async (req, res) => {
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

// AMENITIES CRUD

app.get("/amenities", async (req, res) => {
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

app.get("/amenities/:id", async (req, res) => {
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

app.post("/amenities", authenticateToken, async (req, res) => {
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

app.put("/amenities/:id", authenticateToken, async (req, res) => {
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

app.delete("/amenities/:id", authenticateToken, async (req, res) => {
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
