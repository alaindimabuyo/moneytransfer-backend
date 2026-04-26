# Backend

## Run it

Postgres must be running first

```bash
cp .env.example .env
# Open .env and paste your ExchangeRate-API key into EXCHANGE_RATE_API_KEY
# (free at https://www.exchangerate-api.com/)

npm install
npm run migrate
npm run dev
```

API runs on **http://localhost:4000**.

## Tests

```bash
npm test
```
