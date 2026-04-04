import "dotenv/config";
import createServer from "./utils/createServer.js";

const app = createServer();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
