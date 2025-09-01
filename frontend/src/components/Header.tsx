import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/'); // Redirect to home or login page after logout
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-border bg-background text-foreground">
      <Link to="/" className="text-2xl font-bold">
        find-me
      </Link>
      <nav className="flex items-center space-x-4">
        
        <Link to="/my/results" className="hover:text-primary">내 결과</Link>
        <Link to="/me/entitlements" className="hover:text-primary">내 권한</Link> {/* Added link to entitlements */}
        {isLoggedIn ? (
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            로그아웃
          </Button>
        ) : (
          <>
            <Link to="/login" className="hover:text-primary">로그인</Link>
            <Link to="/signup" className="hover:text-primary">회원가입</Link>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </Button>
      </nav>
    </header>
  );
};

export default Header;