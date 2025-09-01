import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import Meta from '@/lib/seo';

const Home: React.FC = () => {
  const { fetchWithErrorHandler } = useApi();
  const [poem, setPoem] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<string>('');
  

  

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

  

  return (
    <>
      <Meta
        title="FairyLearn — 성향 테스트와 감정 기반 창작"
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