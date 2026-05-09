# Reinova API

NestJS backend with Prisma + PostgreSQL persistence.

## 1) Setup

```bash
npm install
copy .env.example .env
```

Set your PostgreSQL connection in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reinova?schema=public"
```

## 2) Database migration

Run first migration and generate Prisma client:

```bash
npm run prisma:migrate
npm run prisma:generate
```

For production deployments:

```bash
npm run prisma:deploy
```

## 3) Start API

```bash
npm run start:dev
```
