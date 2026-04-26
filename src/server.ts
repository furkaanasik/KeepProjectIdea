import { createApp } from './app.js';
import { getDb } from './db/index.js';
import { createAnalysesRepo } from './services/analysesRepo.js';

const port = Number(process.env.PORT ?? 3000);
const app = createApp({ analysesRepo: createAnalysesRepo(getDb()) });

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
