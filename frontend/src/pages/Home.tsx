import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import useApi from '@/hooks/useApi';
import Meta from '@/lib/seo';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';

type AiHealthResponse = {
  healthy: boolean;
  backendStatus: string;
  aiServiceStatus: string;
  aiServiceResponse?: unknown;
  aiServiceError?: string;
};

const Home: React.FC = () => {
  const { fetchWithErrorHandler } = useApi();
  const { isLoggedIn } = useAuth();
  const { addToast } = useToast();
  const [backendStatusText, setBackendStatusText] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<AiHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string>('');
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  const handleCheckHealth = async () => {
    setIsCheckingHealth(true);
    setBackendStatusText('');
    setHealthStatus(null);
    setHealthError('');
    try {
      const backendHealth = await fetchWithErrorHandler<{ status: string }>('/health');
      setBackendStatusText(backendHealth.status ?? 'unknown');

      const aiHealth = await fetchWithErrorHandler<AiHealthResponse>('/health/ai');
      setHealthStatus(aiHealth);
      if (!aiHealth.healthy && aiHealth.aiServiceError) {
        setHealthError(aiHealth.aiServiceError);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setHealthError(`헬스 체크 실패: ${message}`);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setWalletBalance(null);
      return;
    }

    let cancelled = false;
    const fetchWallet = async () => {
      setIsLoadingWallet(true);
      try {
        const response = await fetchWithErrorHandler<any>('wallets/me');
        if (cancelled) {
          return;
        }
        const rawBalance = response?.balance ?? 0;
        const parsedBalance = Number(rawBalance);
        setWalletBalance(Number.isNaN(parsedBalance) ? 0 : parsedBalance);
      } catch (error) {
        if (!cancelled) {
          addToast('하트 잔액을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
          setWalletBalance(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWallet(false);
        }
      }
    };

    fetchWallet();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, fetchWithErrorHandler, addToast]);

  return (
    <>
      <Meta
        title="FairyLearn — 성향 테스트와 감정 기반 창작"
        description="당신의 성향을 분석하고 감정에 기반한 시와 이미지를 생성해주는 서비스입니다. 자신을 더 깊이 이해하고 창의적인 영감을 얻어보세요."
      />
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span role="img" aria-label="heart" className="text-base">💗</span>
          {isLoggedIn ? (
            <span>
              보유 하트 {isLoadingWallet ? '조회 중...' : <strong className="text-foreground">{(walletBalance ?? 0).toLocaleString('ko-KR')}개</strong>}
            </span>
          ) : (
            <span>로그인 후 하트 잔액을 확인할 수 있어요.</span>
          )}
          <Link
            to={isLoggedIn ? '/me/billing' : '/login'}
            className="inline-flex items-center rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            {isLoggedIn ? '충전하기' : '로그인하기'}
          </Link>
        </div>
        <h1>홈 페이지</h1>
        
        <hr />
        <Link to="/stories">내 동화</Link>
        <br />
        <Link to="/stories/new">새 동화 만들기</Link>
        <br />
        <Link to="/me/characters">내 캐릭터</Link>
        <br />
        <Link to="/shared">공유 게시판</Link>
        <br />
                
        
        <hr />
        <div>
          <h2>연결 상태 확인</h2>
          <div style={{ marginTop: '20px' }}>
            <button onClick={handleCheckHealth} disabled={isCheckingHealth}>
              {isCheckingHealth ? '확인 중...' : 'AI 서비스 연결 상태 확인'}
            </button>
            {backendStatusText && (
              <p style={{ marginTop: '12px' }}>
                <strong>백엔드:</strong> {backendStatusText}
              </p>
            )}
            {healthStatus && (
              <div style={{ marginTop: '12px' }}>
                <p><strong>전체 상태:</strong> {healthStatus.healthy ? '정상' : '이상'}</p>
                <p><strong>AI 서비스:</strong> {healthStatus.aiServiceStatus}</p>
                {Boolean(healthStatus.aiServiceResponse) && (
                  <pre style={{ background: '#f5f5f5', padding: '8px', overflowX: 'auto' }}>
                    {JSON.stringify(healthStatus.aiServiceResponse as any, null, 2)}
                  </pre>
                )}
              </div>
            )}
            {healthError && (
              <p style={{ marginTop: '12px', color: 'red' }}>
                <strong>오류:</strong> {healthError}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
