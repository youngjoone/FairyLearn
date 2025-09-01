import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import useApi from '@/hooks/useApi';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Meta from '@/lib/seo';

interface ResultDetailData {
    id: number;
    testCode: string;
    score: number;
    traits: string; // JSON string
    poem: string;
    createdAt: string;
}

const Share: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { fetchWithErrorHandler } = useApi(); // Use useApi hook
    const [result, setResult] = useState<ResultDetailData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
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
    }, [id, fetchWithErrorHandler]);

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
                title="공유 정보를 불러오는데 실패했습니다."
                description={error}
                icon="⚠️"
            />
        );
    }

    if (!result) {
        return (
            <EmptyState
                title="공유 정보를 찾을 수 없습니다."
                description="해당 ID의 공유 정보가 존재하지 않습니다."
                icon="🔍"
            />
        );
    }

    let parsedTraits: { [key: string]: number } = {};
    try {
        parsedTraits = JSON.parse(result.traits);
    } catch (e) {
        console.error("Failed to parse traits JSON for share:", e);
        setError("성향 데이터를 파싱하는데 실패했습니다.");
    }

    const ogTitle = `find-me 결과 #${result.id}`;
    const ogDescription = `점수 ${result.score.toFixed(2)} | 주요 성향 A:${parsedTraits.A?.toFixed(2) || 'N/A'} B:${parsedTraits.B?.toFixed(2) || 'N/A'} C:${parsedTraits.C?.toFixed(2) || 'N/A'}`;
    const ogImage = `http://localhost:8080/og/${id}.png`; // Dynamic OG image URL

    return (
        <HelmetProvider>
            <Meta
                ogTitle={ogTitle}
                ogDescription={ogDescription}
                ogImage={ogImage}
                ogUrl={window.location.href}
                ogType="website"
                twitterCard="summary_large_image"
                twitterTitle={ogTitle}
                twitterDescription={ogDescription}
                twitterImage={ogImage}
            />
            <div className="p-4">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <h1 className="text-2xl font-bold">공유 카드 미리보기</h1>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">이 페이지는 주로 SNS 공유 시 미리보기 이미지와 텍스트를 제공하기 위한 메타 태그를 포함합니다.</p>
                        <p className="text-muted-foreground">실제 사용자에게는 결과 상세 페이지로 리디렉션될 수 있습니다.</p>
                        <hr className="my-6" />
                        <h2 className="text-xl font-semibold mb-2">결과 요약</h2>
                        <p className="text-muted-foreground"><strong>테스트 코드:</strong> {result.testCode}</p>
                        <p className="text-muted-foreground"><strong>점수:</strong> {result.score.toFixed(2)}</p>
                        <p className="text-muted-foreground"><strong>생성일:</strong> {new Date(result.createdAt).toLocaleString()}</p>
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
                </Card>
            </div>
        </HelmetProvider>
    );
};

export default Share;