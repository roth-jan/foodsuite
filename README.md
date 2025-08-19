# FoodSuite - Professional Kitchen Management System

FoodSuite is a comprehensive multi-tenant SaaS solution for professional kitchen management, featuring inventory tracking, recipe management, meal planning, and cost optimization.

## Features

- 🍽️ **Recipe Management** - Create and manage recipes with nutritional information
- 📦 **Inventory Tracking** - Real-time inventory management with automatic alerts
- 📅 **Meal Planning** - AI-powered meal planning with cost optimization
- 💰 **Cost Analysis** - Track costs and optimize purchasing decisions
- 🏢 **Multi-Tenant** - Support for multiple organizations
- 📊 **Analytics** - Comprehensive reporting and analytics

## Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm 8.x or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/foodsuite.git
cd foodsuite

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start the application
npm start
```

The application will be available at http://localhost:3005

### Default Login
- Username: `admin`
- Password: `Demo123!`

## Deployment

### AWS EC2 Deployment

1. Launch an EC2 instance (Amazon Linux 2)
2. Use the provided `userdata-github.sh` script during instance creation
3. The application will be automatically deployed and accessible on port 80

### Environment Variables

```env
DB_TYPE=memory          # Database type (memory or postgres)
NODE_ENV=production     # Environment
PORT=3005              # Server port
DEFAULT_TENANT_ID=demo # Default tenant ID
```

## Project Structure

```
foodsuite/
├── server.js              # Main server file
├── foodsuite-complete-app.html # Frontend application
├── routes/               # API routes
│   ├── auth.js          # Authentication
│   ├── products.js      # Product management
│   ├── recipes.js       # Recipe management
│   ├── inventory.js     # Inventory tracking
│   ├── ai.js           # AI meal planning
│   └── ...
├── database/            # Database modules
│   ├── db-memory.js    # In-memory database
│   ├── postgres-adapter.js # PostgreSQL adapter
│   └── ...
└── utils/              # Utility functions
```

## API Documentation

The API is RESTful and uses JWT authentication. Base URL: `/api`

### Key Endpoints

- `POST /api/auth/login` - User authentication
- `GET /api/products` - List products
- `GET /api/recipes` - List recipes
- `POST /api/ai/suggest-meals` - AI meal suggestions
- `GET /api/inventory` - Current inventory status

## Technologies

- **Backend**: Node.js, Express.js
- **Database**: In-memory DB (default) or PostgreSQL
- **Frontend**: Bootstrap 5, Vanilla JavaScript
- **Authentication**: JWT
- **AI**: Rule-based meal planning system

## License

MIT License - see LICENSE file for details