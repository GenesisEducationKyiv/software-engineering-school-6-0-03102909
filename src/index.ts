import 'dotenv/config';
import app from './app.js';
import prisma from './db/prisma.js';
import config from './config/env.js';

await prisma.$connect();
console.log('DB connected');

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});
