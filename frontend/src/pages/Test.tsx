import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import RadioLikert from '@/components/ui/FormControls/RadioLikert';
import Button from '@/components/ui/Button';
import Meta from '@/lib/seo';
import { track } from '@/lib/analytics';
import { getAccess } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastProvider';

// Define types for our data
interface Question {
    id: string;
    body: string;
}

interface TestData {
    code: string;
    title: string;
    questions: Question[];
}

interface Answer {
    questionId: string;
    value: number;
}

interface ScoreData {
    score: number;
    traits: Record<string, number>;
}

interface AiResponse {
    poem?: string;
    img_prompt?: string;
    moderation: {
        safe: boolean;
        flags: string[];
    };
}

const Test: React.FC = () => {
    const { fetchWithErrorHandler } = useApi();
    const [testData, setTestData] = useState<TestData | null>(null);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [formError, setFormError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const navigate = useNavigate();
    const { testCode } = useParams<{ testCode: string }>();
    const { addToast } = useToast();

    useEffect(() => {
        const token = getAccess();
        if (!token) {
            addToast('로그인이 필요한 서비스입니다.', 'error');
            navigate('/login');
            return;
        }

        track('test_start', { testCode }); // Track test start event
        const fetchTest = async () => {
            setIsLoading(true);
            try {
                const data = await fetchWithErrorHandler<TestData>(
                    `http://localhost:8080/api/tests/${testCode}`
                );
                setTestData(data);
            } catch (err) {
                // Error handled by fetchWithErrorHandler
            } finally {
                setIsLoading(false);
            }
        };
        if (testCode) {
            fetchTest();
        }
    }, [fetchWithErrorHandler, testCode, addToast, navigate]);

    const handleAnswerChange = (questionId: string, value: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (testData && Object.keys(answers).length !== testData.questions.length) {
            setFormError('모든 문항에 답변해주세요.');
            return;
        }
        
        setFormError(''); // Clear form validation error
        setIsLoading(true);
        track('test_submit', { testCode }); // Track test submit event

        try {
            // 1. Submit answers to backend
            const submissionAnswers: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
                questionId,
                value,
            }));
            
            const scoreData = await fetchWithErrorHandler<ScoreData>(
                `http://localhost:8080/api/tests/${testCode}/submit`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ answers: submissionAnswers }),
                }
            );

            // 2. Call AI service with traits
            const aiRequestBody = {
                profile: { traits: scoreData.traits },
                mood: { tags: ["기쁨", "벅참"], intensity: 85 },
                want: ["poem"]
            };

            track('generate_request', { mood: aiRequestBody.mood.tags[0], traits: aiRequestBody.profile.traits }); // Track AI request
            const aiData = await fetchWithErrorHandler<AiResponse>(
                'http://localhost:8000/ai/generate',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(aiRequestBody),
                }
            );
            track('generate_success', { poemLength: aiData.poem?.length || 0, safe: aiData.moderation.safe }); // Track AI success

            // 3. Navigate to result page with data
            navigate('/result', { state: { traits: scoreData.traits, poem: aiData.poem } });

        } catch (err) {
            track('generate_fail', { error: err instanceof Error ? err.message : String(err) }); // Track AI fail
            // API errors are handled by fetchWithErrorHandler
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !testData) return <p>테스트를 불러오는 중...</p>;
    
    return (
        <>
            <Meta title="테스트 시작 — find-me" />
            <div>
                <h1>{testData?.title || '테스트'}</h1>
                {formError && <p style={{ color: 'red' }}>오류: {formError}</p>}
                <form onSubmit={handleSubmit}>
                    {testData?.questions.map((q, index) => (
                        <div key={q.id} style={{ margin: '20px 0' }}>
                            <p><strong>{index + 1}. {q.body}</strong></p>
                            <RadioLikert
                                name={q.id}
                                value={answers[q.id] || 0}
                                onChange={(val) => handleAnswerChange(q.id, val)}
                            />
                        </div>
                    ))}
                    <Button type="submit" isLoading={isLoading}>
                        제출
                    </Button>
                </form>
            </div>
        </>
    );
};

export default Test;
