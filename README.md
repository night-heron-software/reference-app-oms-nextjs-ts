This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Running Locally

Run npm install:

```bash
# in the project root directory
npm install
```

Make sure there isn't an existing PostgreSQL instance running on port 5234. Set up Neon PostgreSQL:

```bash
# in the project root directory
cd neon
docker-compose up -d
```

Create a .env.local file:

```bash
# in the project root directory
cp example.env.local .env.local
```

Run the local temporal server (installation instructions [here](https://learn.temporal.io/getting_started/typescript/dev_environment/?os=mac#set-up-a-local-temporal-service-for-development-with-temporal-cli) ):

```bash
temporal server start-dev
# or, if you want a persistent database
temporal server start-dev --db-filename local.db
```

Run Next.js and the Workers:

```bash
npm run dev
```

Or

Use the following .vscode/launch.json:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/next/dist/bin/next",
      "runtimeArgs": ["--inspect"],
      "skipFiles": ["<node_internals>/**"],
      "serverReadyAction": {
        "action": "debugWithEdge",
        "killOnServerStop": true,
        "pattern": "- Local:.+(https?://.+)",
        "uriFormat": "%s",
        "webRoot": "${workspaceFolder}"
      }
    }
  ]
}
```

Open the project folder in VSCode and **Run => Start Debugging** or **Run => Run Without Debugging**.

Initialize the PostgreSQL database by going opening [http://localhost:3000/db](http://localhost:3000/db). This URL will also reset an existing database. You will need to stop temporal, remove the database file (local.db in the example) if you are using it, and start temporal again.

Go to [http://localhost:3000](http://localhost:3000) to use the app. Only the [Customer (http://localhost:3000/orders)](http://localhost:3000/orders) and [Courier (http://localhost:3000/shipments)](http://localhost:3000/shipments) pages work properly at this point.

View Temporal information at [Temporal Dashboard (http://localhost:8233)](http://localhost:8233).
