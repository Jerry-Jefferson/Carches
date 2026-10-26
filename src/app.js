require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");

const swaggerDocument = require("./swagger.json");
const connectDB = require("./db/connection");
const apiRouter = require("./routes/api");
const errorHandler = require("./middleware/errorHandler");
const setupGracefulShutdown = require("./utils/gracefulShutdown");

const app = express();
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/v1", apiRouter);
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
