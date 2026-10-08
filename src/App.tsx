import { MongoAuthProvider } from './contexts/MongoAuthContext';
import { useMongoAuth } from './contexts/useMongoAuth';
import { MongoAuth } from './components/MongoAuth';
import { MongoDashboard } from './components/MongoDashboard';

function AppContent() {
  const { user, loading } = useMongoAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  return user ? <MongoDashboard /> : <MongoAuth />;
}

export default function App() {
  return (
    <MongoAuthProvider>
      <AppContent />
    </MongoAuthProvider>
  );
}
