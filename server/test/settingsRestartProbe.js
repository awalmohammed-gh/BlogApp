import mongoose from "mongoose";
if (!process.env.MONGODB_URI?.includes("newsfront_integration") || process.env.NODE_ENV !== "test") throw new Error("This probe only runs against the integration test database.");
const { default: app } = await import("../src/app.js");
await mongoose.connect(process.env.MONGODB_URI);
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
try {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/site/settings`);
  const json = await response.json();
  if (!response.ok) throw new Error("Fresh API process could not read saved settings.");
  console.log(JSON.stringify({ siteName: json.data.values.general.siteName }));
} finally { await new Promise((resolve) => server.close(resolve)); await mongoose.disconnect(); }
