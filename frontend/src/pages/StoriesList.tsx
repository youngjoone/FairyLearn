import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import { Card, CardContent } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Meta from '@/lib/seo';
import { getAccess } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastProvider';

interface StoryListItem {
    id: number;
    title: string;
    ageRange: string;
    language: string;
    status: string;
    createdAt: string;
}

interface StorageQuota {
    limit: number;
    used: number;
}

const StoriesList: React.FC = () => {
    const { fetchWithErrorHandler } = useApi();
    const { addToast } = useToast();
    const [stories, setStories] = useState<StoryListItem[]>([]);
    const [quota, setQuota] = useState<StorageQuota | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [storiesData, quotaData] = await Promise.all([
                    fetchWithErrorHandler<StoryListItem[]>('/stories'),
                    fetchWithErrorHandler<StorageQuota>('/storage/me')
                ]);
                
                if (Array.isArray(storiesData)) {
                    setStories(storiesData);
                } else {
                    console.error("API response for stories is not an array:", storiesData);
                    setStories([]); // Set to empty array to prevent crash
                }

                setQuota(quotaData);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                addToast(`데이터 로드 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [fetchWithErrorHandler, addToast]);

    if (isLoading) {
        return (
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">내 동화</h1>
                <Skeleton className="h-8 w-1/4 mb-4" /> {/* Quota badge skeleton */}
                <div className="flex flex-col gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardContent>
                                <Skeleton className="h-6 w-3/4 mb-2" />
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
                title="동화 목록을 불러오는데 실패했습니다."
                description={error}
                icon="⚠️"
            />
        );
    }

    return (
        <>
            <Meta title="내 동화 — FairyLearn" description="내가 만든 동화 목록" />
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">내 동화</h1>
                {quota && (
                    <div className="mb-4 p-2 bg-blue-100 text-blue-800 rounded-md">
                        저장 공간: {quota.used} / {quota.limit}
                    </div>
                )}
                {stories.length === 0 ? (
                    <EmptyState
                        title="저장된 동화가 없습니다."
                        description="새로운 동화를 만들어보세요!"
                        icon="📖"
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        {stories.map(story => (
                            <Card key={story.id}>
                                <CardContent>
                                    <Link to={`/stories/${story.id}`} className="block">
                                        <h3 className="text-lg font-semibold">{story.title}</h3>
                                        <p className="text-muted-foreground">생성일: {new Date(story.createdAt).toLocaleString()}</p>
                                        <p className="text-muted-foreground">상태: {story.status}</p>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default StoriesList;