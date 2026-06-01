# Builder

Monorepo for Paint App.

## Dev

1. `npm install` to install dependencies.
2. `npm run dev` to start the development server.
3. Open `http://localhost:5173` in your browser to see the app.
4. `npm run test` to run tests.
5. `npm run build` to type-check the app. We'd still just run typescript files in production, so this is just to catch any type errors before we deploy.

## PGTyped Typegen

1. Ensure the database is running and accessible, `docker compose -f ./deploy/local/docker-compose.yaml up -d` from the root of the monorepo should do this.
2. `npm run pgtyped:typegen` to generate types for SQL queries.
