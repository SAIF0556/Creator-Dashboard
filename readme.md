# Creator Dashboard - VertxAI Assignment

A comprehensive web application for content creators to manage their profiles, earn credit points, and interact with a personalized feed.

## Features

### 1. Authentication System
- User registration and login with JWT authentication
- Role-based access control (User/Admin)
- Secure password hashing using bcrypt

### 2. Credit Points System
- Daily login rewards (+5 credits)
- Profile completion bonus (+20 credits)
- Feed interaction rewards (+2 credits per action)
- Admin credit management capabilities
- Credit activity tracking

### 3. Feed Aggregator
- Multi-platform content aggregation (Twitter, Reddit, LinkedIn)
- Unified feed format
- Post interaction features:
  - Save posts
  - Share posts
  - Report posts

### 4. User Dashboard
- Credit balance display
- Saved posts management
- Feed interaction history

### 5. Admin Dashboard
- User management
- Credit analytics
- Reported content moderation
- Activity insights

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- JWT Authentication
- Redis (Optional - for caching)

### Frontend
- Next.js
- Tailwind CSS
- React Query
- React Context API

## Project Structure

```
creator-dashboard/
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middlewares/
│   ├── services/
│   ├── utils/
│   └── config/
└── frontend/
    ├── components/
    ├── pages/
    ├── services/
    ├── hooks/
    ├── utils/
    └── public/
```

## Local Development Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB installation

### Backend Setup
1. Clone the repository
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Credit System
- `GET /api/credits/balance` - Get credit balance
- `GET /api/credits/history` - Get credit history

### Feed Management
- `GET /api/feed` - Get aggregated feed
- `POST /api/feed/save` - Save a post
- `POST /api/feed/report` - Report a post

### Admin Endpoints
- `GET /api/admin/users` - List all users
- `PUT /api/admin/credits` - Update user credits
- `GET /api/admin/analytics` - Get platform analytics

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.
