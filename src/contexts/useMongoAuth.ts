import { useContext } from 'react';
import { MongoAuthContext } from './mongoAuthContextValue';

export function useMongoAuth() {
  const context = useContext(MongoAuthContext);
  if (context === undefined) {
    throw new Error('useMongoAuth must be used within MongoAuthProvider');
  }
  return context;
}
