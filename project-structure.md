# Project Structure and Architecture - Creator Dashboard

## Overview
This document outlines the recommended project structure and architecture for the Creator Dashboard application, providing guidance on how to organize both frontend and backend codebases.

## Backend Structure (Node.js/Express)

```
/backend
├── /config                  # Configuration files
│   ├── db.js                # Database connection
│   ├── redis.js             # Redis connection (optional)
│   └── environment.js       # Environment variables
│
├── /controllers             # Request handlers
│   ├── /auth                # Authentication controllers
│   ├── /users               # User management controllers
│   ├── /credits             # Credit system controllers
│   ├── /feed                # Feed controllers
│   └── /admin               # Admin controllers
│
├── /middleware              # Express middleware
│   ├── auth.middleware.js   # JWT verification
│   ├── role.middleware.js   # Role-based access control
│   ├── error.middleware.js  # Error handling
│   └── validators.js        # Request validation
│
├── /models                  # MongoDB schemas
│   ├── user.model.js
│   ├── credit.model.js
│   ├── content.model.js
│   ├── saved.model.js
│   └── report.model.js
│
├── /routes                  # API routes
│   ├── auth.routes.js
│   ├── users.routes.js
│   ├── credits.routes.js
│   ├── feed.routes.js
│   └── admin.routes.js
│
├── /services                # Business logic
│   ├── /auth                # Authentication services
│   ├── /users               # User services
│   ├── /credits             # Credit calculation services
│   ├── /feed                # Feed aggregation services
│   ├── /notification        # Notification services
│   └── /external-api        # Third-party API integrations
│
├── /utils                   # Utility functions
│   ├── logger.js            # Logging utility
│   ├── helpers.js           # General helpers
│   ├── validators.js        # Custom validators
│   └── constants.js         # Application constants
│
├── /tests                   # Test files
│   ├── /unit                # Unit tests
│   ├── /integration         # Integration tests
│   └── /fixtures            # Test fixtures
│
├── /docs                    # API documentation
│   └── swagger.yaml         # OpenAPI specifications
│
├── app.js                   # Express app setup
├── server.js                # Server entry point
├── Dockerfile               # Docker configuration
├── .env.example             # Example environment variables
└── package.json             # Dependencies and scripts
```

## Frontend Structure (Next.js)

```
/frontend
├── /public                  # Static files
│   ├── /images              # Image assets
│   ├── /icons               # Icon assets
│   └── /fonts               # Font files
│
├── /src                     # Source code
│   ├── /app                 # Next.js App Router
│   │   ├── /api             # API routes
│   │   ├── /auth            # Authentication pages
│   │   │   ├── /login
│   │   │   └── /register
│   │   ├── /dashboard       # Dashboard pages
│   │   ├── /admin           # Admin pages
│   │   ├── /feed            # Feed pages
│   │   ├── /profile         # Profile pages
│   │   ├── /notifications   # Notification pages
│   │   ├── layout.js        # Root layout
│   │   └── page.js          # Homepage
│   │
│   ├── /components          # React components
│   │   ├── /ui              # UI components (buttons, inputs, etc.)
│   │   ├── /layout          # Layout components
│   │   ├── /auth            # Authentication components
│   │   ├── /dashboard       # Dashboard components
│   │   ├── /feed            # Feed components
│   │   └── /admin           # Admin components
│   │
│   ├── /hooks               # Custom React hooks
│   │   ├── useAuth.js       # Authentication hook
│   │   ├── useCredits.js    # Credits hook
│   │   ├── useFeed.js       # Feed hook
│   │   └── useNotification.js # Notifications hook
│   │
│   ├── /lib                 # Library code
│   │   ├── /api             # API client functions
│   │   ├── /utils           # Utility functions
│   │   └── /constants       # Constants
│   │
│   ├── /providers           # React context providers
│   │   ├── AuthProvider.js  # Authentication context
│   │   ├── ThemeProvider.js # Theme context
│   │   └── NotificationProvider.js # Notification context
│   │
│   ├── /styles              # Global styles
│   │   ├── globals.css      # Global CSS
│   │   └── theme.js         # Theme configuration
│   │
│   └── /types               # TypeScript type definitions
│       ├── user.types.ts    # User-related types
│       ├── feed.types.ts    # Feed-related types
│       └── api.types.ts     # API-related types
│
├── /tests                   # Test files
│   ├── /unit                # Unit tests
│   ├── /integration         # Integration tests
│   └── /fixtures            # Test fixtures
│
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── tsconfig.json            # TypeScript configuration
├── .env.example             # Example environment variables
├── Dockerfile               # Docker configuration
├── .eslintrc.js             # ESLint configuration
└── package.json             # Dependencies and scripts
```

## Architecture Overview

### Backend Architecture

1. **API Layer**
   - RESTful API design
   - Express routes and controllers
   - Request validation and sanitization
   - Response formatting
   - Error handling

2. **Service Layer**
   - Business logic implementation
   - External API integrations
   - Credit calculation and management
   - Feed aggregation and processing
   - Notification handling

3. **Data Access Layer**
   - MongoDB models and schemas
   - Database queries and operations
   - Data validation
   - Indexing strategy

4. **Infrastructure Layer**
   - Express application setup
   - Database connection management
   - Redis caching (optional)
   - Environment configuration
   - Logging and monitoring

### Frontend Architecture

1. **Presentation Layer**
   - React components
   - Next.js pages
   - UI component library
   - Responsive layout system

2. **State Management**
   - React Context API for global state
   - Custom hooks for domain-specific state
   - Local component state
   - Form state management

3. **Service/API Layer**
   - API client functions
   - Data fetching and caching
   - Error handling
   - Authentication management

4. **Routing Layer**
   - Next.js App Router
   - Dynamic routes
   - Route protection
   - Navigation management

## Data Flow

1. **Authentication Flow**
   - User submits login credentials
   - Backend validates credentials
   - JWT token generated and returned
   - Frontend stores token in secure HTTP-only cookie
   - Token used for subsequent API requests

2. **Feed Content Flow**
   - Frontend requests feed content
   - Backend fetches content from external APIs
   - Content normalized and processed
   - Cached in Redis (optional)
   - Returned to frontend for display
   - User interactions tracked and stored

3. **Credit Transaction Flow**
   - User performs credit-earning action
   - Backend calculates credit amount based on rules
   - Credit transaction recorded in database
   - User's credit balance updated
   - Notification sent to user
   - Dashboard updated in real-time

4. **Content Interaction Flow**
   - User interacts with content (save, share, report)
   - Frontend sends interaction to backend
   - Backend processes and stores interaction
   - Updates user activity history
   - Adjusts credits if applicable
   - Updates related collections

## API Integration Architecture

1. **Twitter API Integration**
   - OAuth authentication
   - Rate limit handling
   - Content fetching and normalization
   - Error handling and fallbacks

2. **Reddit API Integration**
   - OAuth authentication
   - Subreddit targeting
   - Content filtering
   - Media handling

3. **LinkedIn API Integration (Optional)**
   - OAuth authentication
   - Content type filtering
   - Professional content focus
   - Network activity monitoring

## Deployment Architecture

1. **Backend Deployment (Google Cloud Run)**
   - Containerized Node.js application
   - Autoscaling configuration
   - Environment variable management
   - Logging and monitoring integration

2. **Frontend Deployment (Google Cloud/Firebase)**
   - Static site generation where applicable
   - CDN distribution
   - Cache control strategies
   - Environment configuration

3. **Database (MongoDB Atlas)**
   - Cloud-hosted MongoDB instance
   - Backup strategy
   - Index optimization
   - Connection pooling

4. **Caching Layer (Redis - Optional)**
   - Managed Redis instance
   - Key expiration policies
   - Memory optimization
   - Connection management

## Security Architecture

1. **Authentication Security**
   - Secure JWT implementation
   - Password hashing with bcrypt
   - Rate limiting on authentication endpoints
   - Token refresh mechanism

2. **Data Security**
   - Input validation and sanitization
   - XSS protection
   - CSRF protection
   - Data encryption where necessary

3. **Infrastructure Security**
   - HTTPS enforcement
   - Secure cookie policies
   - Content Security Policy
   - Environment variable protection
