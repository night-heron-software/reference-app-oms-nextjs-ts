import { startDebugReplayer } from "@temporalio/worker"
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

startDebugReplayer({
  workflowsPath: require.resolve("./workflows.ts"),
})
