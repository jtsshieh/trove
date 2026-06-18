This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

The app runs locally, while its data services (Postgres + Redis) run in Docker.

1. **Set up environment variables.** Copy the example file and fill in secrets
   (or use the values already generated in `.env`):

   ```bash
   cp .env.example .env
   # generate secrets:
   #   POSTGRES_PASSWORD -> openssl rand -hex 24   (also update it inside DATABASE_URL)
   #   JWT_SECRET        -> openssl rand -base64 48
   ```

2. **Start the data services** (Postgres + Redis, with persistent volumes):

   ```bash
   docker compose up -d
   ```

3. **Install dependencies and apply the database schema:**

   ```bash
   npm install
   npx prisma migrate deploy   # or `prisma migrate dev` while iterating on the schema
   ```

4. **Run the dev server:**

   ```bash
   npm run dev
   ```

Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in) in your browser.

Stop the data services with `docker compose down` (add `-v` to also wipe the
Postgres/Redis volumes).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
