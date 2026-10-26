# Carshes

REST API for a car sharing service, built with Node.js, Express and MongoDB (Mongoose). It manages cars, drivers and bookings.

## Getting started

1. Create an `.env` file from the example and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

2. Start the app and MongoDB with Docker:

   ```bash
   npm run compose-up
   ```

   Or run the app locally (requires Node.js 22+ and a running MongoDB at `DATABASE_URI`):

   ```bash
   npm install
   npm run dev
   ```

3. (Optional) Seed the database with sample data:

   ```bash
   node src/seed/cars.js
   ```

The API is available at `http://localhost:3000/api/v1` (`/cars`, `/drivers`, `/bookings`), and the Swagger docs at `http://localhost:3000/api-docs`.
