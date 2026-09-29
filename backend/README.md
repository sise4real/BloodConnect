# LifeLink Backend API

Express.js + MongoDB backend for the BloodConnect Blood Donation platform.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure your MongoDB connection in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/blood-donation
JWT_SECRET=your-secret-key-here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

4. Start MongoDB:
```bash
# macOS
brew services start mongodb-community

# Windows - Start MongoDB service

# Linux
sudo systemctl start mongod
```

5. Start the server:
```bash
npm run dev
```

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Available Endpoints

#### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/profile` - Get current user (protected)
- `PUT /auth/profile` - Update profile (protected)

#### Blood Requests
- `GET /blood-requests` - List requests (protected)
- `POST /blood-requests` - Create request (protected)
- `GET /blood-requests/:id` - Get request details (protected)
- `POST /blood-requests/:id/respond` - Respond to request (protected)
- `PUT /blood-requests/:id/moderate` - Moderate request (admin only)
- `PUT /blood-requests/:id/response-status` - Update response (protected)
- `DELETE /blood-requests/:id` - Delete request (protected)

#### Donors
- `GET /donors/search` - Search donors (protected)
- `GET /donors/:id` - Get donor details (protected)
- `GET /donors/stats` - Get statistics (protected)

#### Camps
- `GET /camps` - List camps (protected)
- `POST /camps` - Create camp (protected)
- `GET /camps/:id` - Get camp details (protected)
- `POST /camps/:id/register` - Register for camp (protected)
- `PUT /camps/:id/moderate` - Moderate camp (admin only)
- `DELETE /camps/:id` - Delete camp (protected)

#### Blood Banks
- `GET /blood-banks` - List blood banks (protected)
- `POST /blood-banks` - Create blood bank (admin only)
- `GET /blood-banks/:id` - Get details (protected)
- `PUT /blood-banks/:id` - Update blood bank (admin only)
- `PUT /blood-banks/:id/moderate` - Moderate (admin only)
- `DELETE /blood-banks/:id` - Delete (admin only)

#### Admin
- `GET /admin/dashboard` - Dashboard stats (admin only)
- `GET /admin/pending` - Pending approvals (admin only)
- `GET /admin/users` - List users (admin only)
- `PUT /admin/users/:id` - Update user (admin only)
- `DELETE /admin/users/:id` - Delete user (admin only)

## Database Models

### User
- Email, password (hashed)
- Full name, phone, role
- Blood type (for donors)
- Location (GeoJSON Point with 2dsphere index)
- Availability status
- Last donation date
- Donations count

### BloodRequest
- Requester reference
- Patient name
- Blood type, units needed
- Urgency level (critical/urgent/normal)
- Hospital details
- Location (GeoJSON Point)
- Status (pending/approved/rejected/fulfilled/expired)
- Responses array with donor references
- Moderation notes

### DonationCamp
- Name, description
- Organizer reference
- Date, start time, end time
- Location (GeoJSON Point)
- Capacity and registered donors
- Status with moderation

### BloodBank
- Name, location (GeoJSON Point)
- Contact information
- Operating hours
- Blood inventory
- Verification status

## Geospatial Queries

The API supports location-based queries using MongoDB's geospatial features:

```javascript
// Example: Find donors within 50km
GET /donors/search?latitude=40.7128&longitude=-74.0060&radius=50&bloodType=A+
```

## Error Handling

All errors return JSON with a message:
```json
{
  "message": "Error description"
}
```

Status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

## Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- Role-based access control
- CORS enabled for frontend
- Input validation
- Protected routes with middleware
