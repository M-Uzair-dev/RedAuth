import Express from "express";

const app = Express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "API is working properly!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
