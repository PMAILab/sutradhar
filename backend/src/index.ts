import express from "express";
import cors from "cors";
import { env } from "./config/env.js";

const app = express();

app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "sutradhar-backend" });
});

app.listen(env.port, () => {
  console.log(`Sutradhar backend listening on port ${env.port}`);
});
