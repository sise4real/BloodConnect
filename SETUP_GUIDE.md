# BloodConnect Setup Guide

Complete guide to get BloodConnect running on your local machine.

## Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **MongoDB** (v6 or higher)
   - **macOS**: `brew install mongodb-community`
   - **Windows**: Download from https://www.mongodb.com/try/download/community
   - **Linux**: Follow official MongoDB installation guide
   - Verify: `mongod --version`

3. **Code Editor** (Visual Studio Code recommended)
   - Download from: https://code.visualstudio.com/

## Step-by-Step Installation

### 1. Install MongoDB and Start Service

#### macOS
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

#### Windows
1. Download MongoDB Community Server from official website
2. Run the installer
3. Start MongoDB from Services or run: `net start MongoDB`

#### Linux (Ubuntu/Debian)
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

Verify MongoDB is running:
```bash
mongosh
```

### 2. Clone/Open Project in VS Code

1. Open Visual Studio Code
2. Open the project folder containing this file
3. Open the integrated terminal (Ctrl+` or Cmd+`)

### 3. Setup Backend

Open a new terminal and navigate to backend:

```bash
cd backend
```

Install dependencies:
```bash
npm install
```

Create environment file:
```bash
cp .env.example .env
```

Edit `backend/.env` file (use VS Code):
```env
MONGODB_URI=mongodb://localhost:27017/blood-donation
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Start the backend server:
```bash
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost
🚀 Server running on port 5000
🌍 Environment: development
```

### 4. Setup Frontend

Open a NEW terminal (don't close the backend terminal):

Navigate to project root (if you're in backend folder):
```bash
cd ..
```

Install dependencies:
```bash
npm install
```

Create environment file:
```bash
cp .env.example .env
```

Edit `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm run dev
```

You should see:
```
VITE v5.4.8  ready in X ms

➜  Local:   http://localhost:5173/
```

### 5. Open the Application

Open your browser and go to: **http://localhost:5173/**

## Creating Your First Admin User

You need an admin account to access the admin panel. There are two ways:

### Method 1: Register and Upgrade (Easier)

1. Register a normal account through the website
2. Open MongoDB Compass or mongosh
3. Connect to: `mongodb://localhost:27017`
4. Select database: `blood-donation`
5. Find your user in the `users` collection
6. Update the role field to "admin"

Using mongosh:
```javascript
use blood-donation
db.users.updateOne(
  { email: "youremail@example.com" },
  { $set: { role: "admin" } }
)
```

### Method 2: Direct Insert

Using mongosh:
```javascript
use blood-donation

db.users.insertOne({
  email: "admin@bloodconnect.com",
  password: "$2a$10$YourHashedPasswordHere", // Will be hashed on first password change
  fullName: "Admin User",
  role: "admin",
  phone: "+1234567890",
  location: {
    type: "Point",
    coordinates: [-74.006, 40.7128],
    address: "Admin Address",
    city: "New York",
    state: "NY"
  },
  isActive: true,
  isVerified: true,
  availability: false,
  donationsCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Testing the Application

### 1. Register as Donor
- Click "Create Account"
- Select "Donor" role
- Fill in all details including blood type
- Allow location access when prompted
- Complete registration

### 2. Create Blood Request
- Click "New Request" button
- Fill in patient details
- Select blood type and urgency
- Add hospital information
- Submit request

### 3. Test Admin Panel
- Logout from donor account
- Login with admin credentials
- View pending approvals
- Approve/reject the blood request

### 4. Test Donor Response
- Logout from admin
- Login with donor account
- View approved blood requests
- Click "I Can Help" on a matching request
- Submit response

## Troubleshooting

### MongoDB Connection Failed
- Verify MongoDB is running: `mongosh`
- Check port 27017 is not used by another process
- Review connection string in backend/.env

### Backend Won't Start
- Check if port 5000 is already in use
- Verify all dependencies installed: `cd backend && npm install`
- Check MongoDB is accessible

### Frontend Won't Start
- Verify port 5173 is available
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check if VITE_API_URL in .env is correct

### Location Not Working
- Allow location permission in browser
- Check browser console for errors
- Some browsers block location on non-HTTPS sites

### Build Errors
- Run `npm install` in both root and backend directories
- Clear dist folder: `rm -rf dist`
- Try: `npm run build`

## Running Both Servers Together

Instead of opening two terminals, you can run both with one command:

```bash
npm run dev:all
```

This uses `concurrently` to run both frontend and backend simultaneously.

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in .env
2. Use a real MongoDB instance (MongoDB Atlas recommended)
3. Update JWT_SECRET to a strong random string
4. Use PM2 or similar process manager
5. Setup reverse proxy with Nginx

### Frontend
1. Update VITE_API_URL to production API URL
2. Run: `npm run build`
3. Deploy `dist` folder to hosting service (Netlify, Vercel, etc.)

## Project Structure Quick Reference

```
bloodconnect/
├── backend/                  # Express API
│   ├── src/
│   │   ├── models/          # MongoDB schemas
│   │   ├── controllers/     # Business logic
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth & validation
│   │   └── server.js        # Entry point
│   └── package.json
├── src/                     # React frontend
│   ├── components/          # UI components
│   ├── contexts/            # State management
│   ├── hooks/              # Custom hooks
│   └── lib/                # API client
└── package.json
```

## Need Help?

- Check the main README.md for detailed documentation
- Review backend/README.md for API documentation
- Check browser console for frontend errors
- Check terminal for backend errors
- Verify MongoDB logs for database issues

## Next Steps

Once everything is running:
1. Create test users with different roles
2. Submit sample blood requests
3. Test the geolocation features
4. Explore the admin panel
5. Create donation camps
6. Add blood banks to the directory

Happy coding! 🩸❤️
