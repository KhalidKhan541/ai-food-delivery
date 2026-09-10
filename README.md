# AI Food Delivery Platform

An AI-powered food delivery platform built with Next.js 14, Prisma, PostgreSQL, Stripe, and React Query.

## Features

- **Restaurant Management** - Browse restaurants, menus, and reviews
- **AI Recommendations** - Personalized food suggestions based on order history
- **Real-time Delivery Tracking** - Live GPS tracking with ETA updates
- **Smart Pricing** - Dynamic delivery fees and surge pricing
- **Payment Processing** - Stripe integration with full refund support
- **Inventory Management** - Stock tracking with low-stock alerts
- **Loyalty Program** - Points-based rewards with tier system
- **Promo Codes** - Percentage and fixed-amount discounts
- **Multi-role Support** - Customers, restaurant owners, delivery drivers, admins

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Auth | NextAuth.js |
| Payments | Stripe |
| State | React Query |
| Styling | Tailwind CSS |
| Validation | Zod |
| Testing | Jest |
| CI/CD | GitHub Actions |
| Container | Docker |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+ (optional, for caching)
- Docker & Docker Compose (optional)

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/ai-food-delivery.git
cd ai-food-delivery

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed the database
npm run db:seed

# Start development server
npm run dev
```

### Docker Development

```bash
# Start all services
docker compose up -d

# Run migrations
docker compose exec app npx prisma migrate dev

# Seed database
docker compose exec app npm run db:seed

# View logs
docker compose logs -f app
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npx jest tests/unit

# Run API tests only
npx jest tests/api

# Run integration tests only
npx jest tests/integration

# Run tests with coverage
npx jest --coverage

# Run specific test file
npx jest tests/unit/cart.test.ts
```

## Project Structure

```
ai-food-delivery/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities, configs, types
│   └── types/            # TypeScript type definitions
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seed script
├── tests/
│   ├── api/              # API endpoint tests
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── helpers/          # Test utilities
├── .github/workflows/    # CI/CD pipelines
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Development services
└── docker-compose.prod.yml # Production services
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | NextAuth session secret | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes |
| `REDIS_URL` | Redis connection string | No |
| `SMTP_HOST` | Email server host | No |
| `SMTP_PORT` | Email server port | No |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out

### Restaurants
- `GET /api/restaurants` - List restaurants
- `GET /api/restaurants/:id` - Restaurant details
- `POST /api/restaurants` - Create restaurant (owner)
- `PATCH /api/restaurants/:id` - Update restaurant

### Menu
- `GET /api/restaurants/:id/menu` - List menu items
- `POST /api/restaurants/:id/menu` - Add menu item
- `PATCH /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Remove menu item

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id/status` - Update status
- `DELETE /api/orders/:id` - Cancel order

### Payments
- `POST /api/payments` - Process payment
- `POST /api/payments/:id/refund` - Process refund
- `POST /api/payments/webhook` - Stripe webhook

### Delivery
- `GET /api/deliveries/:id` - Track delivery
- `PATCH /api/deliveries/:id` - Update location/status

### AI
- `GET /api/ai/recommendations` - Get recommendations
- `GET /api/ai/search` - AI-powered search
- `GET /api/ai/similar/:itemId` - Similar items

## Database Schema

Key models: `User`, `Restaurant`, `MenuItem`, `Order`, `OrderItem`, `Delivery`, `DeliveryDriver`, `Payment`, `Inventory`, `Review`, `PromoCode`, `LoyaltyPoint`

## Deployment

### Production

```bash
# Build and push Docker image
docker build -t ai-food-delivery:latest --target runner .
docker push registry/ai-food-delivery:latest

# Deploy with Docker Compose
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Environment Setup

1. Copy `.env.example` to `.env.production`
2. Set production secrets
3. Configure database credentials
4. Set up Stripe webhook endpoint

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License. See [LICENSE](LICENSE) for details.
