import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { FirstBloodToast } from './components/FirstBloodToast';

import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Challenges } from './pages/Challenges';
import { Leaderboard } from './pages/Leaderboard';
import { Team } from './pages/Team';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div className="loading-spinner"></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-[#060a14]"><div className="loading-spinner"></div></div>;
  }

  return (
    <>
      <Navbar />
      <FirstBloodToast />
      
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          
          <Route 
            path="/challenges" 
            element={
              <ProtectedRoute>
                <Challenges />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/team" 
            element={
              <ProtectedRoute>
                <Team />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
