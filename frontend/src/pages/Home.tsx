import React, { useState } from 'react';
import { Link } from 'react-router-dom';


import useApi from '@/hooks/useApi';
import Meta from '@/lib/seo';

const Home: React.FC = () => {
  const { fetchWithErrorHandler } = useApi();
  const [healthStatus, setHealthStatus] = useState<string>('');
  
  
  
  

  

  

  

  

  const handleGenerateStory = async () => {
    try {
      const requestBody = {
        ageRange: "4-5",
        topics: ["SCIENCE"],
        objectives: ["counting"],
        minPages: 10,
        language: "KO"
      };
      const response = await fetchWithErrorHandler('http://localhost:8080/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      console.log('Story generation response:', response);
      alert('동화 생성 요청을 보냈습니다. 콘솔을 확인하세요.');
    } catch (error) {
      console.error('Story generation failed:', error);
      alert('동화 생성 요청 실패. 콘솔을 확인하세요.');
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
        <Link to="/stories">내 동화</Link>
        <br />
        <Link to="/stories/new">새 동화 만들기</Link>
        <br />
        <Link to="/shared">공유 게시판</Link>
        <br />
                
        
        <hr />
        <div>
          <h2>E2E 테스트</h2>
          <div>
            <button onClick={handleGenerateStory}>AI 동화 생성</button>
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
