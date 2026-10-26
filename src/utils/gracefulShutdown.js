const setupGracefulShutdown = (server, disconnectDb) => {
  const shutdown = async (code = 0) => {
    console.log("Shutting down gracefully...");
    server.close(async () => {
      await disconnectDb();
      console.log("Database disconnected.");
      process.exit(code);
    });
  };

  process.on("SIGTERM", () => shutdown(0));
  process.on("SIGINT", () => shutdown(0));

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
    shutdown(1);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    shutdown(1);
  });
};

module.exports = setupGracefulShutdown;
