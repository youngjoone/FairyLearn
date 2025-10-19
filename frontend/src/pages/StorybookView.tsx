import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import { useToast } from '@/components/ui/ToastProvider';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

interface StorybookPageData {
    id: number;
    pageNumber: number;
    text: string;
    image_url: string | null; // Changed from imageUrl to image_url
    audio_url?: string | null;
}

const StorybookView: React.FC = () => {
    const { id, slug } = useParams<{ id?: string; slug?: string }>();
    const navigate = useNavigate();
    const { fetchWithErrorHandler } = useApi();
    const { addToast } = useToast();

    const [pages, setPages] = useState<StorybookPageData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
    const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
    const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const fetchPages = async () => {
            try {
                const endpoint = slug
                    ? `/public/shared-stories/${slug}/storybook/pages`
                    : `/stories/${id}/storybook/pages`;
                const data = await fetchWithErrorHandler<StorybookPageData[]>(endpoint);
                setPages(data);

                const allImagesGenerated = data.every(p => p.image_url); // Changed to image_url
                if (allImagesGenerated && pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                addToast(`페이지 로드 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchPages(); // Initial fetch

        // Start polling
        pollingIntervalRef.current = setInterval(fetchPages, 5000); // Poll every 5 seconds

        // Cleanup on unmount
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [id, slug, fetchWithErrorHandler, addToast]);

    const goToNextPage = () => {
        setCurrentPageIndex(prev => Math.min(prev + 1, pages.length - 1));
    };

    const goToPrevPage = () => {
        setCurrentPageIndex(prev => Math.max(prev - 1, 0));
    };

    const currentPage = pages[currentPageIndex];

    useEffect(() => {
        if (currentPage?.audio_url) {
            setCurrentAudioUrl(currentPage.audio_url);
        } else {
            setCurrentAudioUrl('');
        }
    }, [currentPage?.id, currentPage?.audio_url]);

    const playAudioElement = () => {
        if (audioRef.current) {
            try {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.load();
                void audioRef.current.play();
            } catch (error) {
                console.warn('오디오 재생에 실패했습니다.', error);
            }
        }
    };

    const requestAudio = async (forceRegenerate: boolean) => {
        if (!currentPage) {
            return;
        }

        if (slug) {
            addToast('공유된 동화 페이지에서는 새로운 음성 생성을 지원하지 않습니다.', 'info');
            return;
        }

        if (!id) {
            addToast('스토리 ID를 확인할 수 없습니다.', 'error');
            return;
        }

        setIsAudioLoading(true);
        try {
            const endpoint = `/stories/${id}/storybook/pages/${currentPage.id}/audio`;
            const payload = {
                storyId: id,
                pageId: currentPage.id,
                text: currentPage.text,
                paragraphId: String(currentPage.pageNumber ?? currentPage.id),
                forceRegenerate,
            };

            const updatedPage = await fetchWithErrorHandler<StorybookPageData>(endpoint, {
                method: 'POST',
                body: payload,
            });

            setPages(prev =>
                prev.map(p => (p.id === updatedPage.id ? { ...p, audio_url: updatedPage.audio_url } : p))
            );

            if (updatedPage.audio_url) {
                setCurrentAudioUrl(updatedPage.audio_url);
                setTimeout(playAudioElement, 0);
                addToast(forceRegenerate ? '음성을 다시 생성했어요.' : '음성을 생성했어요.', 'success');
            } else {
                addToast('음성을 생성하지 못했습니다.', 'error');
            }
        } catch (err) {
            addToast(`음성 생성 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setIsAudioLoading(false);
        }
    };

    const handlePlayAudio = () => {
        if (!currentPage) {
            return;
        }

        if (currentPage.audio_url) {
            setCurrentAudioUrl(currentPage.audio_url);
            setTimeout(playAudioElement, 0);
            return;
        }

        if (slug) {
            addToast('이 페이지에는 아직 음성이 준비되지 않았어요.', 'info');
            return;
        }

        void requestAudio(false);
    };

    if (isLoading) {
        return <Skeleton className="w-full h-96" />;
    }

    if (error) {
        return <EmptyState title="동화책을 불러올 수 없습니다." description={error} />;
    }

    if (pages.length === 0) {
        return <EmptyState title="아직 생성된 페이지가 없습니다." description="잠시 후 다시 시도해주세요." />;
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="border rounded-lg p-4">
                {currentPage.image_url ? ( // Changed to image_url
                    <img src={currentPage.image_url} alt={`Page ${currentPage.pageNumber}`} className="w-full h-auto object-contain rounded-md mb-4" />
                ) : (
                    <div className="w-full h-96 bg-gray-200 flex items-center justify-center rounded-md mb-4">
                        <p>이미지 생성 중...</p>
                    </div>
                )}
                <p className="text-lg whitespace-pre-wrap">{currentPage.text}</p>
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="flex gap-2">
                        <Button onClick={handlePlayAudio} disabled={isAudioLoading}>
                            {isAudioLoading
                                ? '음성 준비 중...'
                                : currentPage.audio_url
                                ? '음성 재생'
                                : '음성 생성'}
                        </Button>
                        {!slug && (
                            <Button
                                variant="outline"
                                onClick={() => requestAudio(true)}
                                disabled={isAudioLoading || !currentPage.audio_url}
                            >
                                다시 생성
                            </Button>
                        )}
                    </div>
                    {currentAudioUrl && (
                        <audio controls ref={audioRef} src={currentAudioUrl} className="w-full md:w-auto">
                            <track kind="captions" />
                        </audio>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center mt-4">
                <Button onClick={goToPrevPage} disabled={currentPageIndex === 0}>이전 장</Button>
                <span>{currentPageIndex + 1} / {pages.length}</span>
                <Button onClick={goToNextPage} disabled={currentPageIndex === pages.length - 1}>다음 장</Button>
            </div>

            <div className="text-center mt-6">
                {slug ? (
                    <Button onClick={() => navigate(`/shared/${slug}`)} variant="outline">공유 페이지로 돌아가기</Button>
                ) : (
                    <Button onClick={() => navigate(`/stories/${id}`)} variant="outline">원래 동화로 돌아가기</Button>
                )}
            </div>
        </div>
    );
};

export default StorybookView;
