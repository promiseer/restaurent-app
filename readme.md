# Restaurant Food Ordering Application

A full-stack web application for food ordering with role-based access control (RBAC) and country-based access management.
## 🎥 Demo
<div align="center">
    <img src="demo.gif" alt="Demo" style="width: 100%; max-width: 1000px;" />
</div>

## 🚀 Features

### Core Functionality

- **Restaurant & Menu Management**: Browse restaurants and view menu items
- **Order Management**: Create orders, add food items to cart
- **Payment Processing**: Checkout and pay using different payment methods
- **Order Lifecycle**: Place, track, and cancel orders

### Role-Based Access Control (RBAC)

- **Admin**: Full access to all features across all countries
- **Manager**: Can view, order, and cancel orders (country-specific access)
- **Member**: Can view and add to cart only (country-specific access)

### Country-Based Access Control

- **India**: Managers and Members from India can only access Indian restaurants and data
- **America**: Managers and Members from America can only access American restaurants and data
- **Admin**: Can access data from all countries

## 🏗️ Architecture

### Backend (Node.js + Express + MongoDB)

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based and country-based middleware
- **Database**: MongoDB with Mongoose ODM
- **Security**: Helmet, CORS, Rate limiting
- **API**: RESTful API design

### Frontend (Next.js + React + TypeScript)

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: React hooks and context
- **UI Components**: Custom components with responsive design

## 📋 User Roles & Permissions

| Function                      | Admin | Manager     | Member      |
| ----------------------------- | ----- | ----------- | ----------- |
| View restaurants & menu items | ✅    | ✅          | ✅          |
| Create order (add food items) | ✅    | ✅          | ✅          |
| Place order (checkout & pay)  | ✅    | ✅          | ❌          |
| Cancel order                  | ✅    | ✅          | ❌          |
| Update payment method         | ✅    | ❌          | ❌          |
| Country access                | All   | Own country | Own country |

## 🔧 Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

## 📥 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd restaurant-app
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend Environment

Create `backend/.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/restaurant_app
JWT_SECRET=your_jwt_secret_key_here_make_it_very_long_and_secure
NODE_ENV=development
```

#### Frontend Environment

Create `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Database Setup

#### Start MongoDB

```bash
# Using MongoDB service (Windows)
net start MongoDB

# Using MongoDB directly
mongod

# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### Seed Database with Sample Data

```bash
cd backend
npm run seed
```

This will create:

- **6 test users** with different roles and countries
- **4 sample restaurants** (2 in India, 2 in America)
- **Sample menu items** for each restaurant

## 🚀 Running the Application

### Development Mode

#### Option 1: Run both frontend and backend simultaneously

```bash
# From root directory
npm run dev
```

#### Option 2: Run separately

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Production Mode

```bash
# Build frontend
cd frontend
npm run build

# Start backend
cd ../backend
npm start

# Serve frontend
cd ../frontend
npm start
```

## 🌐 Access URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **API Health Check**: http://localhost:5000/api/health

## 👥 Test Accounts

| Name            | Email                       | Password   | Role    | Country |
| --------------- | --------------------------- | ---------- | ------- | ------- |
| Nick Fury       | nick.fury@admin.com         | admin123   | Admin   | America |
| Captain Marvel  | captain.marvel@manager.com  | manager123 | Manager | India   |
| Captain America | captain.america@manager.com | manager123 | Manager | America |
| Thanos          | thanos@member.com           | member123  | Member  | India   |
| Thor            | thor@member.com             | member123  | Member  | India   |
| Travis          | travis@member.com           | member123  | Member  | America |

## 📚 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/verify` - Verify JWT token

### Restaurants

- `GET /api/restaurants` - Get restaurants (country-filtered)
- `GET /api/restaurants/:id` - Get restaurant details
- `GET /api/restaurants/:id/menu` - Get restaurant menu
- `POST /api/restaurants` - Create restaurant (Admin only)

### Orders

- `GET /api/orders` - Get orders (role & country filtered)
- `POST /api/orders` - Create order (Admin/Manager only)
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/cancel` - Cancel order (Admin/Manager only)

### Payments

- `GET /api/payments/methods` - Get payment methods
- `POST /api/payments/process` - Process payment
- `POST /api/payments/methods` - Add payment method (Admin only)

### Users (Admin only)

- `GET /api/users` - Get all users
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🧪 Testing the RBAC System

### Test Scenarios

1. **Admin Access**:

   - Login as Nick Fury
   - Can see restaurants from both countries
   - Can place and cancel orders
   - Can manage payment methods
2. **Manager Access**:

   - Login as Captain Marvel (India) or Captain America (America)
   - Can only see restaurants from their country
   - Can place and cancel orders
   - Cannot manage payment methods
3. **Member Access**:

   - Login as Thanos, Thor (India) or Travis (America)
   - Can only see restaurants from their country
   - Can add items to cart but cannot place orders
   - Cannot cancel orders or manage payments

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Configured for secure cross-origin requests
- **Helmet**: Security headers for Express
- **Input Validation**: Server-side validation for all inputs

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JSON Web Tokens (JWT)
- **Password Hashing**: bcryptjs
- **Security**: Helmet, CORS, express-rate-limit

### Frontend

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Fetch API
- **Routing**: Next.js App Router

## 📂 Project Structure

```
restaurant-app/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & validation middleware
│   ├── scripts/         # Database seeding scripts
│   └── server.js        # Express server
├── frontend/
│   ├── app/             # Next.js app directory
│   ├── components/      # React components
│   ├── lib/             # Utility functions
│   └── styles/          # CSS styles
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

**Built with ❤️ using Next.js, Node.js, and MongoDB**
