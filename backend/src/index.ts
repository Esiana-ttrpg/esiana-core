import { env } from './config/env.js';
import { createApp } from './app.js';
import { createServer } from 'node:http';
import { attachCampaignWebSocketServer } from './lib/campaignWebSocketServer.js';

const app = await createApp();
const server = createServer(app);
attachCampaignWebSocketServer(server);

server.listen(env.port, () => {
  console.log(`Esiana API listening on http://localhost:${env.port}`);
  console.log(`  uploads: ${env.uploadsDir}`);
  console.log(`  plugins: ${env.pluginsDir}`);
  console.log(`  database: ${env.databaseProvider}`);
  console.log(`  core version: ${env.coreVersion}`);
});
