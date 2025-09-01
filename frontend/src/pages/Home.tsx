import React, { useState } from 'react';


import useApi from '@/hooks/useApi';
import Meta from '@/lib/seo';

const Home: React.FC = () => {
  const { fetchWithErrorHandler } = useApi();
  const [healthStatus, setHealthStatus] = useState<string>('');
  
  
  
  

  

  

  

  

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
        
        <br />
                
        
        <hr />
        <div>
          <h2>E2E 테스트</h2>
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