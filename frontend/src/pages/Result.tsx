import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const Result: React.FC = () => {
    const location = useLocation();
    const { traits, poem } = location.state || { traits: null, poem: '결과가 없습니다.' };

    let parsedTraits: { [key: string]: number } = {};
    if (traits) {
        try {
            parsedTraits = traits; // traits is already parsed from Test.tsx
        } catch (e) {
            console.error("Failed to parse traits JSON:", e);
        }
    }

    return (
        <div className="p-4">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <h1 className="text-2xl font-bold">테스트 결과</h1>
                </CardHeader>
                <CardContent>
                    {parsedTraits ? (
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold mb-2">당신의 성향</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {Object.entries(parsedTraits).map(([key, value]) => (
                                    <div key={key} className="flex items-center space-x-2">
                                        <Badge variant="default">{key}</Badge>
                                        <span className="text-lg">{Number(value).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">성향 데이터를 불러올 수 없습니다.</p>
                    )}
                    
                    <hr className="my-6" />

                    <h2 className="text-xl font-semibold mb-2">AI가 생성한 시</h2>
                    <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-muted-foreground">
                        {poem}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Link to="/my/results">
                        <Button>내 결과 히스토리 보기</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Result;