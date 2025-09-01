import React, { useState, useEffect } from 'react';
import useApi from '@/hooks/useApi';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/FormControls/Input';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Meta from '@/lib/seo';

interface AnalyticsSummary {
    totals: { [key: string]: number };
    funnel: { [key: string]: number };
}

const AdminAnalytics: React.FC = () => {
    const { fetchWithErrorHandler } = useApi();
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    useEffect(() => {
        // Set default dates to last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        setFromDate(formatDate(sevenDaysAgo));
        setToDate(formatDate(today));
    }, []);

    const fetchSummary = async (from: string, to: string) => {
        setIsLoading(true);
        setError('');
        try {
            const data = await fetchWithErrorHandler<AnalyticsSummary>(
                `http://localhost:8080/api/analytics/summary?from=${from}&to=${to}`
            );
            setSummary(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (fromDate && toDate) {
            fetchSummary(fromDate, toDate);
        }
    }, [fromDate, toDate, fetchWithErrorHandler]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'fromDate') {
            setFromDate(value);
        } else {
            setToDate(value);
        }
    };

    if (isLoading && !summary) {
        return (
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">분석 요약</h1>
                <Card>
                    <CardContent>
                        <Skeleton className="h-6 w-full mb-4" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                title="분석 데이터를 불러오는데 실패했습니다."
                description={error}
                icon="⚠️"
            />
        );
    }

    return (
        <>
            <Meta title="관리자 분석 — find-me" description="find-me 서비스의 익명 이벤트 분석 요약 화면입니다." />
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">분석 요약</h1>
                <Card className="mb-6">
                    <CardHeader>
                        <h2 className="text-xl font-semibold">기간 선택</h2>
                    </CardHeader>
                    <CardContent className="flex space-x-4">
                        <Input type="date" name="fromDate" value={fromDate} onChange={handleDateChange} />
                        <Input type="date" name="toDate" value={toDate} onChange={handleDateChange} />
                        <Button onClick={() => fetchSummary(fromDate, toDate)}>조회</Button>
                    </CardContent>
                </Card>

                {summary ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <h2 className="text-xl font-semibold">총 이벤트</h2>
                            </CardHeader>
                            <CardContent>
                                <table className="w-full text-left table-auto">
                                    <thead>
                                        <tr>
                                            <th className="py-2">이벤트명</th>
                                            <th className="py-2">횟수</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(summary.totals).map(([key, value]) => (
                                            <tr key={key}>
                                                <td className="py-2">{key}</td>
                                                <td className="py-2">{value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <h2 className="text-xl font-semibold">퍼널 전환율</h2>
                            </CardHeader>
                            <CardContent>
                                <table className="w-full text-left table-auto">
                                    <thead>
                                        <tr>
                                            <th className="py-2">퍼널</th>
                                            <th className="py-2">전환율</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(summary.funnel).map(([key, value]) => (
                                            <tr key={key}>
                                                <td className="py-2">{key}</td>
                                                <td className="py-2">{(value * 100).toFixed(2)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <EmptyState title="조회된 분석 데이터가 없습니다." description="기간을 선택하고 조회 버튼을 눌러주세요." icon="📊" />
                )}
            </div>
        </>
    );
};

export default AdminAnalytics;
