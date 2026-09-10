# Contributing to AI Food Delivery

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Git
- Docker (optional)

### Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Submit a pull request

```bash
git clone https://github.com/your-username/ai-food-delivery.git
cd ai-food-delivery
git checkout -b feature/your-feature-name
npm install
cp .env.example .env.local
npx prisma generate
npx prisma db push
npm run dev
```

## Code Standards

### TypeScript

- Use TypeScript for all new files
- Avoid `any` type; use proper types
- Use Zod for runtime validation
- Prefer interfaces over type aliases for object shapes

### React Components

- Use functional components with hooks
- Keep components under 200 lines
- One component per file
- Use descriptive names: `OrderCard` not `Card`

### File Naming

```
components/
  orders/
    OrderCard.tsx
    OrderList.tsx
  restaurants/
    RestaurantCard.tsx
hooks/
  useOrders.ts
  useRestaurant.ts
```

### CSS/Styling

- Use Tailwind CSS utility classes
- Use `cn()` from `@/lib/utils` for conditional classes
- Follow the existing design system
- Use CSS variables for theme colors

## Testing

### Writing Tests

- Write tests for all new features
- Maintain above 80% coverage
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

```typescript
describe("OrderCard", () => {
  it("should display order total with tax", () => {
    // Arrange
    const order = createMockOrder({ subtotal: 25.98 });

    // Act
    render(<OrderCard order={order} />);

    // Assert
    expect(screen.getByText("$28.06")).toBeInTheDocument();
  });
});
```

### Test Categories

- **Unit tests** (`tests/unit/`) - Pure functions, isolated logic
- **API tests** (`tests/api/`) - API endpoint behavior
- **Integration tests** (`tests/integration/`) - Cross-system flows

### Running Tests

```bash
npm test                    # All tests
npx jest tests/unit         # Unit only
npx jest --coverage         # With coverage
npx jest --watch            # Watch mode
```

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation
- `test/description` - Test additions

### Commit Messages

Follow Conventional Commits:

```
feat: add real-time delivery tracking
fix: resolve payment processing race condition
refactor: extract order validation logic
test: add unit tests for pricing engine
docs: update API endpoint documentation
```

### Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Request review from maintainers
5. Address review feedback
6. Squash and merge

## Project Architecture

### Directory Structure

```
src/
├── app/              # Routes and pages
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Utilities and helpers
├── types/            # TypeScript types
└── styles/           # Global styles
```

### Key Patterns

- **Server Components** for data fetching
- **Client Components** for interactivity
- **Zod schemas** for validation
- **Prisma** for database access
- **React Query** for server state

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details
- Screenshots if applicable

### Feature Requests

Include:
- Problem description
- Proposed solution
- Alternatives considered
- Use cases

## Code Review

All submissions require review. We use GitHub pull requests. Reviewers will check:

- Code quality and style
- Test coverage
- Documentation
- Performance implications
- Security concerns

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
