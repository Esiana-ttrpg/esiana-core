import { env } from './config/env.js';
import { createApp } from './app.js';

const app = await createApp();

app.listen(env.port, () => {
  console.log(`Esiana API listening on http://localhost:${env.port}`);
  console.log(`  uploads: ${env.uploadsDir}`);
  console.log(`  plugins: ${env.pluginsDir}`);
  console.log(`  database: ${env.databaseProvider}`);
  console.log(`  core version: ${env.coreVersion}`);
});
