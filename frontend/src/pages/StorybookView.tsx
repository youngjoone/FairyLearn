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
}

const StorybookView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { fetchWithErrorHandler } = useApi();
    const { addToast } = useToast();

    const [pages, setPages] = useState<StorybookPageData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchPages = async () => {
            try {
                const data = await fetchWithErrorHandler<StorybookPageData[]>(
                    `/stories/${id}/storybook/pages`
                );
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
    }, [id, fetchWithErrorHandler, addToast]);

    const goToNextPage = () => {
        setCurrentPageIndex(prev => Math.min(prev + 1, pages.length - 1));
    };

    const goToPrevPage = () => {
        setCurrentPageIndex(prev => Math.max(prev - 1, 0));
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

    const currentPage = pages[currentPageIndex];

    console.log('Current Page Image URL:', currentPage.image_url); // Changed to image_url

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
            </div>

            <div className="flex justify-between items-center mt-4">
                <Button onClick={goToPrevPage} disabled={currentPageIndex === 0}>이전 장</Button>
                <span>{currentPageIndex + 1} / {pages.length}</span>
                <Button onClick={goToNextPage} disabled={currentPageIndex === pages.length - 1}>다음 장</Button>
            </div>

            <div className="text-center mt-6">
                <Button onClick={() => navigate(`/stories/${id}`)} variant="outline">원래 동화로 돌아가기</Button>
            </div>
        </div>
    );
};

export default StorybookView;
