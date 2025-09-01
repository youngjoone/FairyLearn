import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import Meta from '@/lib/seo';

const Home: React.FC = () => {
  const { fetchWithErrorHandler } = useApi();
  const [poem, setPoem] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [localJwtToken, setLocalJwtToken] = useState<string | null>(null); // New state

  useEffect(() => {
    // Update localJwtToken whenever localStorage changes (e.g., after login/logout)
    const handleStorageChange = () => {
      setLocalJwtToken(localStorage.getItem('jwtToken'));
    };
    window.addEventListener('storage', handleStorageChange); // Listen for changes in other tabs/windows
    setLocalJwtToken(localStorage.getItem('jwtToken')); // Initial load

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Run once on mount

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (localJwtToken) { // Use the state variable
        try {
          const data = await fetchWithErrorHandler<{ id: string, email: string, nickname: string }>(
            'http://localhost:8080/api/me',
            { // Explicitly pass headers
              headers: {
                'Authorization': `Bearer ${localJwtToken}`,
              },
            }
          );
          setUserEmail(data.email);
          setUserNickname(data.nickname);
        } catch (error) {
          // Only remove token if it's a specific authentication error (e.g., 401)
          // For now, let's just log and not remove the token automatically
          // The useApi hook already handles general network errors and toasts
          console.error('Failed to fetch user info:', error);
          // If it's a 401, consider redirecting to login or clearing token
          // For now, let's keep the token and let the user try again or log out manually
          // localStorage.removeItem('jwtToken'); // REMOVED
          setUserEmail(null);
          setUserNickname(null);
        }
      } else {
        // No token, clear user info
        setUserEmail(null);
        setUserNickname(null);
      }
    };
    fetchUserInfo();
  }, [fetchWithErrorHandler, localJwtToken]); // <--- Changed dependency

  const handleGetPoem = async () => {
    try {
      const requestBody = {
        profile: {
          traits: {}
        },
        mood: {
          tags: ['기쁨'],
          intensity: 50
        },
        want: ["poem"]
      };

      const data = await fetchWithErrorHandler<{ poem: string }>(
        'http://localhost:8000/ai/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      setPoem(data.poem);
    } catch (error) {
      setPoem('시를 받아오는데 실패했습니다.');
    }
  };

  const handleGetHealth = async () => {
    try {
      const data = await fetchWithErrorHandler<{ status: string }>(
        'http://localhost:8080/api/health'
      );
      setHealthStatus(JSON.stringify(data));
    } catch (error) {
      setHealthStatus('백엔드 상태를 확인하는데 실패했습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    setUserEmail(null);
    setUserNickname(null);
    alert('로그아웃 되었습니다.');
  };

  return (
    <>
      <Meta
        title="find-me — 성향 테스트와 감정 기반 창작"
        description="당신의 성향을 분석하고 감정에 기반한 시와 이미지를 생성해주는 서비스입니다. 자신을 더 깊이 이해하고 창의적인 영감을 얻어보세요."
      />
      <div>
        <h1>홈 페이지</h1>
        
        <hr />
        <Link to="/my/results">내 결과 히스토리</Link>
        <br />
                <Link to="/test/mbti_v1">mbti 테스트</Link>
        <br />
        <Link to="/test/teto_egen_v1">테토/에겐 테스트</Link>
        <hr />
        <div>
          <h2>E2E 테스트</h2>
          <div>
            <button onClick={handleGetPoem}>AI 시 받아오기</button>
            {poem && <p><strong>응답:</strong> {poem}</p>}
          </div>
          <div style={{ marginTop: '20px' }}>
            <button onClick={handleGetHealth}>백엔드 상태 확인</button>
            {healthStatus && <p><strong>응답:</strong> {healthStatus}</p>}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;