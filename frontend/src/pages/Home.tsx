import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import useApi from '@/hooks/useApi';
import Meta from '@/lib/seo';

type AiHealthResponse = {
  healthy: boolean;
  backendStatus: string;
  aiServiceStatus: string;
  aiServiceResponse?: unknown;
  aiServiceError?: string;
};

const Home: React.FC = () => {
  const { fetchWithErrorHandler } = useApi();
  const [backendStatusText, setBackendStatusText] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<AiHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string>('');
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

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

  return (
    <>
      <Meta
        title="FairyLearn — 성향 테스트와 감정 기반 창작"
        description="당신의 성향을 분석하고 감정에 기반한 시와 이미지를 생성해주는 서비스입니다. 자신을 더 깊이 이해하고 창의적인 영감을 얻어보세요."
      />
      <div>
        <h1>홈 페이지</h1>
        
        <hr />
        <Link to="/stories">내 동화</Link>
        <br />
        <Link to="/stories/new">새 동화 만들기</Link>
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
                {'aiServiceResponse' in healthStatus && healthStatus.aiServiceResponse && (
                  <pre style={{ background: '#f5f5f5', padding: '8px', overflowX: 'auto' }}>
                    {JSON.stringify(healthStatus.aiServiceResponse, null, 2)}
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
