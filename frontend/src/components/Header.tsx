import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn, profile, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/'); // Redirect to home or login page after logout
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-border bg-background text-foreground">
      <Link to="/" className="text-2xl font-bold">
        FairyLearn
      </Link>
      <nav className="flex items-center space-x-4">
        {isLoggedIn ? (
          <>
            <Link to="/me/profile" className="hover:text-primary">내 프로필</Link>
            <Link to="/me/billing" className="hover:text-primary">결제 관리</Link>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {profile ? `${(profile.nickname || profile.email)}님 환영합니다!` : '로그인 중...'}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              로그아웃
            </Button>
          </>
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
