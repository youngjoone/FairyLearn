import React, { useEffect, useState } from 'react';
import useApi from '@/hooks/useApi';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Meta from '@/lib/seo';
import { useNavigate } from 'react-router-dom';

interface SharedStorySummary {
    shareSlug: string;
    title: string;
    sharedAt: string;
    preview: string;
}

const SharedStoriesBoard: React.FC = () => {
    const { fetchWithErrorHandler } = useApi();
    const navigate = useNavigate();
    const [items, setItems] = useState<SharedStorySummary[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const loadBoard = async () => {
            setIsLoading(true);
            try {
                const data = await fetchWithErrorHandler<SharedStorySummary[]>(
                    '/public/shared-stories'
                );
                const normalized = data
                    .map(item => ({
                        ...item,
                        shareSlug: item.shareSlug ?? (item as any).share_slug ?? ''
                    }))
                    .filter(item => !!item.shareSlug);
                setItems(normalized);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setIsLoading(false);
            }
        };
        loadBoard();
    }, [fetchWithErrorHandler]);

    if (isLoading) {
        return (
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">공유된 동화</h1>
                <div className="flex flex-col gap-4">
                    {[...Array(3)].map((_, idx) => (
                        <Card key={idx}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                title="공유 게시판을 불러올 수 없습니다."
                description={error}
                icon="⚠️"
            />
        );
    }

    if (items.length === 0) {
        return (
            <EmptyState
                title="아직 공유된 동화가 없어요."
                description="첫 번째 공유자가 되어보세요!"
                icon="🌟"
            />
        );
    }

    return (
        <>
            <Meta title="공유된 동화 게시판 — FairyLearn" description="사용자들이 공유한 동화를 모아보세요." />
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">공유된 동화</h1>
                <div className="flex flex-col gap-4">
                    {items.map(item => (
                        <Card key={item.shareSlug}>
                            <CardHeader>
                                <h2 className="text-xl font-semibold">{item.title}</h2>
                                <p className="text-sm text-muted-foreground">
                                    공유일: {new Date(item.sharedAt).toLocaleString()}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
                                    {item.preview || '프리뷰가 아직 준비되지 않았습니다.'}
                                </p>
                                <Button onClick={() => navigate(`/shared/${item.shareSlug}`)}>
                                    동화 보기
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
};

export default SharedStoriesBoard;
