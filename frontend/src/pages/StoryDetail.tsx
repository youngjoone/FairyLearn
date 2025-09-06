import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/FormControls/Select';
import Meta from '@/lib/seo';
import { getAccess } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastProvider';

interface StoryDetailData {
    id: number;
    title: string;
    ageRange: string;
    topics: string[];
    language: string;
    lengthLevel: string;
    status: string;
    createdAt: string;
    pages: { pageNo: number; text: string }[];
    quiz?: { q: string; a: string }[];
}

const languageOptions = [
    { value: 'English', label: '영어' },
    { value: 'Korean', label: '한국어' },
    { value: 'Chinese', label: '중국어' },
    { value: 'French', label: '불어' },
    { value: 'Spanish', label: '스페인어' },
];

const StoryDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { fetchWithErrorHandler } = useApi();
    const { addToast } = useToast();
    const [story, setStory] = useState<StoryDetailData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [targetLanguage, setTargetLanguage] = useState<string>('English');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchStory = async () => {
            setIsLoading(true);
            try {
                const data = await fetchWithErrorHandler<StoryDetailData>(
                    `/stories/${id}`
                );
                setStory(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                addToast(`동화 불러오기 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchStory();
    }, [id, fetchWithErrorHandler, addToast]);

    const handleTranslate = async () => {
        if (!story) return;
        console.log(`Translating story ${story.id} to ${targetLanguage}`);
        addToast(`'${targetLanguage}'로 번역 기능은 현재 구현 중입니다.`, 'info');
    };

    const handleDelete = async () => {
        if (!window.confirm('정말로 이 동화를 삭제하시겠습니까?')) {
            return;
        }
        try {
            await fetchWithErrorHandler(`/stories/${id}`, {
                method: 'DELETE',
            });
            addToast('동화가 성공적으로 삭제되었습니다.', 'success');
            navigate('/stories');
        } catch (err) {
            addToast(`동화 삭제 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
    };

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
                title="동화를 불러오는데 실패했습니다."
                description={error}
                icon="⚠️"
            />
        );
    }

    if (!story) {
        return (
            <EmptyState
                title="동화를 찾을 수 없습니다."
                description="해당 ID의 동화가 존재하지 않습니다."
                icon="🔍"
            />
        );
    }

    return (
        <>
            <Meta title={story.title} description={`동화: ${story.title}`} />
            <div className="p-4">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <h1 className="text-2xl font-bold mb-2">{story.title}</h1>
                        <p className="text-sm text-muted-foreground">
                            생성일: {new Date(story.createdAt).toLocaleString()} | 상태: {story.status}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            연령대: {story.ageRange} | 언어: {story.language} | 길이: {story.lengthLevel}
                        </p>
                        {story.topics && story.topics.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                주제: {story.topics.join(', ')}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        {story.pages && story.pages.map(page => (
                            <p key={page.pageNo} className="mb-4 whitespace-pre-wrap">
                                {page.text}
                            </p>
                        ))}
                    </CardContent>

                    {story.quiz && story.quiz.length > 0 && (
                        <div className="p-4 border-t border-border">
                            <h2 className="text-xl font-semibold mb-2">퀴즈</h2>
                            <div className="space-y-2">
                                {story.quiz.map((item, index) => (
                                    <div key={index} className="p-2 bg-gray-100 rounded-md">
                                        <p className="font-medium">Q{index + 1}: {item.q}</p>
                                        <p className="text-sm text-muted-foreground">A: {item.a}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <CardFooter className="flex justify-end items-center space-x-2">
                        <Select 
                            options={languageOptions}
                            selectedValue={targetLanguage}
                            onChange={setTargetLanguage}
                            className="w-32"
                        />
                        <Button onClick={handleTranslate}>번역하기</Button>
                    </CardFooter>
                </Card>

                <div className="flex justify-center space-x-4 mt-6">
                    <Button onClick={() => navigate('/stories')} variant="outline">목록으로</Button>
                    <Button onClick={handleDelete} variant="destructive">삭제</Button>
                </div>
            </div>
        </>
    );
};

export default StoryDetail;