require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");

const swaggerDocument = require("./swagger.json");
const connectDB = require("./db/connection");
const apiRouter = require("./routes/api");
const errorHandler = require("./middleware/errorHandler");
const setupGracefulShutdown = require("./utils/gracefulShutdown");

const app = express();
// Security headers (nosniff, frame-ancestors, HSTS, a strict CSP for the Swagger UI page, …)
app.use(helmet());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/v2", apiRouter);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  setupGracefulShutdown(server, () => mongoose.disconnect());
};

startServer();
