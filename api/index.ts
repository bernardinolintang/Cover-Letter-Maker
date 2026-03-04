import app from "../backend/src/index.js";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};

export default app;
