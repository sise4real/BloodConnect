# BloodConnect - Connecting Lives Through Blood Donation

A comprehensive, production-ready blood donation platform connecting donors with recipients, hospitals, and blood banks. Built with MongoDB backend and React frontend, featuring real-time GPS-based donor matching, intelligent notification system, donation eligibility tracking, and comprehensive admin moderation.

## Features

- **User Management**: Separate roles for donors, recipients, hospitals, and administrators
- **Blood Request System**: Create and manage urgent blood requests with accept/reject workflows
- **GPS-Based Donor Search**: Find nearby donors using real-time geolocation with radius filtering
- **Donation Eligibility Management**: Auto-check donor availability with 3-month wait period tracking
- **Real-time Notifications**: In-app notifications for blood requests, donation camps, and eligibility reminders
- **Geolocation Integration**: Interactive maps showing nearby donors, camps, and blood banks
- **Donation Camps**: Organize and register for blood donation events
- **Blood Banks Directory**: Searchable database of verified blood banks with inventory tracking
- **Admin Moderation**: Comprehensive admin panel for approving/rejecting requests and managing users
- **Donor Network**: Maintain healthy donor network with donation history and statistics

## Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Geospatial queries with 2dsphere indexes
- RESTful API architecture

### Frontend
- React 18 + TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Leaflet for interactive maps
- Context API for state management

## Project Structure

```
bloodconnect/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── BloodRequest.js
│   │   │   ├── DonationCamp.js
│   │   │   └── BloodBank.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── bloodRequestController.js
│   │   │   ├── donorController.js
│   │   │   ├── campController.js
│   │   │   ├── bloodBankController.js
│   │   │   └── adminController.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── bloodRequestRoutes.js
│   │   │   ├── donorRoutes.js
│   │   │   ├── campRoutes.js
│   │   │   ├── bloodBankRoutes.js
│   │   │   └── adminRoutes.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── src/
│   ├── components/
│   │   ├── Logo.tsx
│   │   ├── MapView.tsx
│   │   ├── MongoAuth.tsx
│   │   ├── MongoDashboard.tsx
│   │   ├── MongoAdminPanel.tsx
│   │   └── BloodRequestCard.tsx
│   ├── contexts/
│   │   └── MongoAuthContext.tsx
│   ├── hooks/
│   │   └── useGeolocation.ts
│   ├── lib/
│   │   └── api.ts
│   └── App.tsx
└── package.json
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher) installed locally or MongoDB Atlas account
- Visual Studio Code or preferred IDE

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/blood-donation
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

5. Make sure MongoDB is running locally:
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Windows
# Start MongoDB service from Services

# On Linux
sudo systemctl start mongod
```

6. Start the backend server:
```bash
npm run dev
```

The backend will run on http://localhost:5000

### Frontend Setup

1. Navigate to the project root directory

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update the `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
```

5. Start the development server:
```bash
npm run dev
```

The frontend will run on http://localhost:5173

### Running Both Servers Simultaneously

You can run both frontend and backend together:
```bash
npm run dev:all
```

## Creating an Admin User

To create an admin user, you need to directly insert into MongoDB:

```javascript
// Connect to MongoDB using mongosh or MongoDB Compass
use blood-donation

// Insert admin user (password will be hashed on first login)
db.users.insertOne({
  email: "admin@bloodconnect.com",
  password: "$2a$10$YourHashedPasswordHere",
  fullName: "Admin User",
  role: "admin",
  phone: "+1234567890",
  location: {
    type: "Point",
    coordinates: [-74.006, 40.7128]
  },
  isActive: true,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Or register normally and update the role:
```javascript
db.users.updateOne(
  { email: "youremail@example.com" },
  { $set: { role: "admin" } }
)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Blood Requests
- `GET /api/blood-requests` - List blood requests
- `POST /api/blood-requests` - Create request
- `GET /api/blood-requests/:id` - Get single request
- `POST /api/blood-requests/:id/respond` - Respond to request
- `PUT /api/blood-requests/:id/moderate` - Moderate request (admin)
- `PUT /api/blood-requests/:id/response-status` - Update response status
- `DELETE /api/blood-requests/:id` - Delete request

### Donors
- `GET /api/donors/search` - Search donors by blood type and location
- `GET /api/donors/stats` - Get donor statistics
- `GET /api/donors/:id` - Get donor details
- `GET /api/donors/eligibility` - Check donation eligibility
- `POST /api/donors/donation-history` - Update donation history

### Notifications
- `GET /api/notifications` - List user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Donation Camps
- `GET /api/camps` - List camps
- `POST /api/camps` - Create camp
- `GET /api/camps/:id` - Get camp details
- `POST /api/camps/:id/register` - Register for camp
- `PUT /api/camps/:id/moderate` - Moderate camp (admin)

### Blood Banks
- `GET /api/blood-banks` - List blood banks
- `POST /api/blood-banks` - Create blood bank (admin)
- `GET /api/blood-banks/:id` - Get blood bank details
- `PUT /api/blood-banks/:id/moderate` - Moderate blood bank (admin)

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/pending` - Pending approvals
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user status
- `DELETE /api/admin/users/:id` - Delete user

## Features Walkthrough

### For Donors

1. **Register** with blood type and location
2. **Check eligibility** - System automatically validates donation readiness
3. **Receive notifications** when nearby requests match your blood type
4. **Browse blood requests** on the map and list view
5. **Respond to requests** that match your blood type
6. **Track donation history** - View donation count and last donation date
7. **Register for donation camps** in your area

### For Recipients

1. **Create blood requests** with urgency level
2. **Track responses** from willing donors
3. **Accept/reject donor responses**
4. **Mark donations as completed** when fulfilled
5. **View nearby blood banks**

### For Admins

1. **Review and approve/reject** all blood requests
2. **Moderate donation camps** before they go live
3. **Verify blood banks** in the directory
4. **Manage user accounts** - activate/deactivate users
5. **View system statistics** and activity

## Database Schema

### User Model
- Authentication and profile information
- Role-based access (donor, recipient, hospital, admin)
- Geolocation with 2dsphere index for proximity search
- Blood type and availability status
- Donation history and eligibility tracking
- Last donation date with 3-month cooldown period

### Blood Request Model
- Patient and requester information
- Blood type, units needed, urgency level
- Hospital details and location
- Response tracking with accept/reject
- Admin moderation workflow

### Donation Camp Model
- Event details and organizer info
- Geolocation for proximity search
- Registration system with capacity limits
- Admin approval required

### Blood Bank Model
- Contact and location information
- Blood inventory tracking by blood type
- Verification status
- Operating hours

### Notification Model
- User-specific notifications
- Type-based categorization (blood_request, donation_camp, eligibility_reminder, etc.)
- Read/unread status tracking
- Automatic notifications for nearby blood requests

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Protected API routes
- Input validation
- CORS configuration

## Build for Production

### Frontend
```bash
npm run build
```

### Backend
Set `NODE_ENV=production` in your `.env` file and use a process manager like PM2:
```bash
npm install -g pm2
cd backend
pm2 start src/server.js --name "bloodconnect-api"
```

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
