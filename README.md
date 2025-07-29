This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Running Locally

Make sure there isn't an existing PostgreSQL instance running on port 5234. Set up Neon PostgreSQL:

```bash
# from the project root directory:
cd neon
docker-compose up -d
```

Run the local temporal server:

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

Open the project folder in VSCode and **Run => Start Debugging** or **Run => Run Without Debugging**.

Initialize the PostgreSQL database by going opening [http://localhost:3000/db](http://localhost:3000/db). This URL will also reset an existing database. You will need to stop temporal, remove the database file (local.db in the example) if you are using it, and start temporal again.

Go to [http://localhost:3000](http://localhost:3000) to use the app. Only the [Customer](http://localhost:3000/orders) and [Courier](http://localhost:3000/shipments) pages work properly at this point.

View Temporal information at [Temporal Dashboard (http://localhost:8233)](http://localhost:8233).
