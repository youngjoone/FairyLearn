import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Meta from '@/lib/seo';
import { getAccess } from '../lib/auth';
import { useToast } from '@/components/ui/ToastProvider';

interface ResultDetailData {
    id: number;
    testCode: string;
    score: number;
    traits: string; // JSON string
    poem: string;
    createdAt: string;
}

const ResultDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { fetchWithErrorHandler } = useApi();
    const [result, setResult] = useState<ResultDetailData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();
    const { addToast } = useToast();

    useEffect(() => {
        const token = getAccess();
        if (!token) {
            addToast('로그인이 필요한 서비스입니다.', 'error');
            navigate('/login');
            return;
        }

        const fetchResult = async () => {
            setIsLoading(true);
            try {
                const data = await fetchWithErrorHandler<ResultDetailData>(
                    `http://localhost:8080/api/results/${id}`
                );
                setResult(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setIsLoading(false);
            }
        };
        fetchResult();
    }, [id, fetchWithErrorHandler, addToast, navigate]);

    if (isLoading) {
        return (
            <div className="p-4">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2 mb-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-4" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                title="결과를 불러오는데 실패했습니다."
                description={error}
                icon="⚠️"
            />
        );
    }

    if (!result) {
        return (
            <EmptyState
                title="결과를 찾을 수 없습니다."
                description="해당 ID의 결과가 존재하지 않습니다."
                icon="🔍"
            />
        );
    }

    let parsedTraits: { [key: string]: number } = {};
    try {
        parsedTraits = JSON.parse(result.traits);
    } catch (e) {
        console.error("Failed to parse traits JSON:", e);
        setError("성향 데이터를 파싱하는데 실패했습니다.");
    }

    const pageTitle = `find-me 결과 #${result.id}`;
    const pageDescription = `점수 ${result.score.toFixed(2)} | 주요 성향 A:${parsedTraits.A?.toFixed(2) || 'N/A'} B:${parsedTraits.B?.toFixed(2) || 'N/A'} C:${parsedTraits.C?.toFixed(2) || 'N/A'}`;

    return (
        <>
            <Meta
                title={pageTitle}
                description={pageDescription}
            />
            <div className="p-4">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <h1 className="text-2xl font-bold">결과 상세 보기 #{result.id}</h1>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground"><strong>테스트 코드:</strong> {result.testCode}</p>
                        <p className="text-muted-foreground"><strong>점수:</strong> {result.score.toFixed(2)}</p>
                        <p className="text-muted-foreground"><strong>생성일:</strong> {new Date(result.createdAt).toLocaleString()}</p>
                        <hr className="my-6" />
                        <h2 className="text-xl font-semibold mb-2">당신의 성향</h2>
                        {parsedTraits && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {Object.entries(parsedTraits).map(([key, value]) => (
                                    <div key={key} className="flex items-center space-x-2">
                                        <Badge variant="default">{key}</Badge>
                                        <span className="text-lg">{Number(value).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <hr className="my-6" />
                        <h2 className="text-xl font-semibold mb-2">AI가 생성한 시</h2>
                        <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-muted-foreground">
                            {result.poem}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                        <Link to={`/share/${result.id}`}>
                            <Button>공유하기</Button>
                        </Link>
                        <Link to="/my/results">
                            <Button variant="outline">목록으로</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
};

export default ResultDetail;
