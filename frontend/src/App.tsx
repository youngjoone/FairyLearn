import { Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Test from '@/pages/Test';
import Result from '@/pages/Result';
import AuthCallback from '@/pages/AuthCallback';

import MyResults from '@/pages/MyResults';
import ResultDetail from '@/pages/ResultDetail';
import Share from '@/pages/Share';
import AdminAnalytics from '@/pages/AdminAnalytics';
import MyEntitlements from '@/pages/MyEntitlements';
import AdminTests from '@/pages/AdminTests';
import Signup from '@/pages/Signup';
import Login from '@/pages/Login';
import Header from '@/components/Header';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@/App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <Header />
          <main className="container mx-auto p-4 flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              
              <Route path="/test/:testCode" element={<Test />} />
              <Route path="/result" element={<Result />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/my/results" element={<MyResults />} />
              <Route path="/my/results/:id" element={<ResultDetail />} />
              <Route path="/share/:id" element={<Share />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/me/entitlements" element={<MyEntitlements />} />
              <Route path="/admin/tests" element={<AdminTests />} /> {/* Add AdminTests route */}
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>
          <footer className="p-4 text-center text-sm text-muted-foreground border-t border-border">
            <p>익명 이벤트 수집(세션ID)으로 서비스 개선에 활용합니다. 개인정보는 저장하지 않습니다.</p>
          </footer>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;