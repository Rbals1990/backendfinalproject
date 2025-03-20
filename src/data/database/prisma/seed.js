import { PrismaClient } from "@prisma/client";
import path from "path";

// Laad de JSON-bestanden via de ES-module import-syntax
import amenitiesData from "../../../data/amenities.json" assert { type: "json" };
import bookingsData from "../../../data/bookings.json" assert { type: "json" };
import hostsData from "../../../data/hosts.json" assert { type: "json" };
import propertiesData from "../../../data/properties.json" assert { type: "json" };
import reviewsData from "../../../data/reviews.json" assert { type: "json" };
import usersData from "../../../data/users.json" assert { type: "json" };

const prisma = new PrismaClient();

async function main() {
  // Clear existing data to avoid duplicates
  await prisma.property.deleteMany(); // Verwijder eerst de properties
  await prisma.amenity.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.user.deleteMany();
  await prisma.host.deleteMany(); // Verwijder daarna de hosts

  // Voeg data toe, zoals je al deed voor de rest van je entities
  for (const amenity of amenitiesData.amenities) {
    await prisma.amenity.create({
      data: amenity,
    });
  }

  // Voeg de gebruikers toe
  for (const user of usersData.users) {
    await prisma.user.create({
      data: user,
    });
  }

  // Voeg de hosts toe
  for (const host of hostsData.hosts) {
    await prisma.host.create({
      data: host,
    });
  }

  // Voeg de properties toe
  for (const property of propertiesData.properties) {
    await prisma.property.create({
      data: {
        id: property.id,
        title: property.title,
        description: property.description,
        location: property.location,
        pricePerNight: property.pricePerNight,
        bedroomCount: property.bedroomCount,
        bathRoomCount: property.bathRoomCount,
        maxGuestCount: property.maxGuestCount,
        rating: property.rating,
        host: {
          connect: { id: property.hostId }, // Verbind de host met de property
        },
      },
    });
  }

  // Voeg de bookings toe
  for (const booking of bookingsData.bookings) {
    await prisma.booking.create({
      data: {
        id: booking.id,
        checkinDate: booking.checkinDate,
        checkoutDate: booking.checkoutDate,
        numberOfGuests: booking.numberOfGuests,
        totalPrice: booking.totalPrice,
        bookingStatus: booking.bookingStatus,
        user: {
          connect: { id: booking.userId }, // Verbind de gebruiker met de booking
        },
        property: {
          connect: { id: booking.propertyId }, // Verbind de property met de booking
        },
      },
    });
  }

  // Voeg de reviews toe
  for (const review of reviewsData.reviews) {
    await prisma.review.create({
      data: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        user: {
          connect: { id: review.userId }, // Verbind de gebruiker met de review
        },
        property: {
          connect: { id: review.propertyId }, // Verbind de property met de review
        },
      },
    });
  }

  // Voeg de relatie van amenities toe aan properties (many-to-many)
  for (const property of propertiesData.properties) {
    const amenities = property.amenities || [];
    for (const amenityId of amenities) {
      await prisma.propertyAmenity.create({
        data: {
          propertyId: property.id,
          amenityId: amenityId,
        },
      });
    }
  }

  console.log("Database successfully populated!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
