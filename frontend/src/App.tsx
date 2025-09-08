import { Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import StoriesList from '@/pages/StoriesList';
import StoryDetail from '@/pages/StoryDetail';
import NewStory from '@/pages/NewStory.tsx';
import StorybookView from '@/pages/StorybookView.tsx';


import AuthCallback from '@/pages/AuthCallback';




import AdminAnalytics from '@/pages/AdminAnalytics';
import MyEntitlements from '@/pages/MyEntitlements';

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
              <Route path="/stories" element={<StoriesList />} />
              <Route path="/stories/:id" element={<StoryDetail />} />
              <Route path="/storybook/:id" element={<StorybookView />} />
              <Route path="/stories/new" element={<NewStory />} />
              
              
              
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              
              
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/me/entitlements" element={<MyEntitlements />} />
              
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