import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Input from '@/components/ui/FormControls/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import Meta from '@/lib/seo';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';

interface TestDefImportRequest {
    code: string;
    title: string;
    version: number;
    questions: string;
    scoring: string;
}

interface TestDefResponse {
    id: number;
    code: string;
    title: string;
    version: number;
    status: string;
    questions: string;
    scoring: string;
    createdAt: string;
    updatedAt: string;
}

interface TestDefListItem {
    id: number;
    code: string;
    title: string;
    version: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

const AdminTests: React.FC = () => {
    const { fetchWithErrorHandler } = useApi();
    const { addToast } = useToast();
    const location = useLocation();
    const [adminToken, setAdminToken] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'import' | 'list'>('import');

    // Import form state
    const [importForm, setImportForm] = useState<TestDefImportRequest>({
        code: '',
        title: '',
        version: 1,
        questions: '',
        scoring: '',
    });
    const [isImporting, setIsImporting] = useState(false);

    // List state
    const [testDefs, setTestDefs] = useState<TestDefListItem[]>([]);
    const [isListLoading, setIsListLoading] = useState(false);
    const [listError, setListError] = useState('');

    // Detail modal state
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTestDef, setSelectedTestDef] = useState<TestDefResponse | null>(null);
    const [_isDetailLoading, setIsDetailLoading] = useState(false);
    const [_detailError, setDetailError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        if (token) {
            setAdminToken(token);
            localStorage.setItem('adminToken', token); // Persist token
        } else {
            const storedToken = localStorage.getItem('adminToken');
            if (storedToken) {
                setAdminToken(storedToken);
            } else {
                addToast('관리자 토큰이 필요합니다. URL에 ?token=YOUR_TOKEN 을 추가해주세요.', 'error');
            }
        }
    }, [location.search, addToast]);

    useEffect(() => {
        if (adminToken && activeTab === 'list') {
            fetchTestDefs();
        }
    }, [adminToken, activeTab]);

    const fetchTestDefs = async () => {
        if (!adminToken) return;
        setIsListLoading(true);
        setListError('');
        try {
            const data = await fetchWithErrorHandler<TestDefListItem[]>(
                'http://localhost:8080/api/admin/tests',
                { headers: { 'X-Admin-Token': adminToken } }
            );
            setTestDefs(data);
        } catch (err) {
            setListError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsListLoading(false);
        }
    };

    const handleImportChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setImportForm(prev => {
            const updatedState = { ...prev };

            if (name === 'version') {
                updatedState.version = parseInt(value, 10) || 1;
            } else if (name === 'code' || name === 'title' || name === 'questions' || name === 'scoring') {
                updatedState[name] = value;
            }

            return updatedState;
        });
    };

    const handleImportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminToken) {
            addToast('관리자 토큰이 없습니다.', 'error');
            return;
        }
        setIsImporting(true);
        try {
            const response = await fetchWithErrorHandler<TestDefResponse>(
                'http://localhost:8080/api/admin/tests/import',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Token': adminToken,
                    },
                    body: JSON.stringify(importForm),
                }
            );
            addToast(`테스트 정의 '${response.code}' v${response.version}이(가) DRAFT로 임포트되었습니다.`, 'success');
            setImportForm({ code: '', title: '', version: 1, questions: '', scoring: '' }); // Reset form
            setActiveTab('list'); // Switch to list view
        } catch (err) {
            // Error handled by fetchWithErrorHandler
        } finally {
            setIsImporting(false);
        }
    };

    const handlePublish = async (code: string, version: number) => {
        if (!adminToken) {
            addToast('관리자 토큰이 없습니다.', 'error');
            return;
        }
        if (!window.confirm(`'${code}' v${version}을(를) 발행하시겠습니까? 기존 PUBLISHED 버전은 ARCHIVED됩니다.`)) {
            return;
        }
        setIsListLoading(true); // Show loading for list
        try {
            const response = await fetchWithErrorHandler<TestDefResponse>(
                `http://localhost:8080/api/admin/tests/${code}/${version}/publish`,
                {
                    method: 'POST',
                    headers: { 'X-Admin-Token': adminToken },
                }
            );
            addToast(`테스트 정의 '${response.code}' v${response.version}이(가) 발행되었습니다.`, 'success');
            fetchTestDefs(); // Refresh list
        } catch (err) {
            // Error handled by fetchWithErrorHandler
        } finally {
            setIsListLoading(false);
        }
    };

    const handleViewDetail = async (code: string, version: number) => {
        if (!adminToken) {
            addToast('관리자 토큰이 없습니다.', 'error');
            return;
        }
        setIsDetailLoading(true);
        setDetailError('');
        try {
            const data = await fetchWithErrorHandler<TestDefResponse>(
                `http://localhost:8080/api/admin/tests/${code}/${version}`,
                { headers: { 'X-Admin-Token': adminToken } }
            );
            setSelectedTestDef(data);
            setIsDetailModalOpen(true);
        } catch (err) {
            setDetailError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsDetailLoading(false);
        }
    };

    if (!adminToken) {
        return (
            <EmptyState
                title="관리자 권한이 필요합니다."
                description="URL에 ?token=YOUR_TOKEN을 추가하여 접근해주세요."
                icon="🔑"
            />
        );
    }

    return (
        <>
            <Meta title="테스트 관리 — find-me" description="find-me 서비스의 테스트 정의를 관리하는 화면입니다." />
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">테스트 관리 (CMS)</h1>

                <div className="flex border-b mb-4">
                    <button
                        className={`py-2 px-4 ${activeTab === 'import' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setActiveTab('import')}
                    >
                        JSON 임포트
                    </button>
                    <button
                        className={`py-2 px-4 ${activeTab === 'list' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setActiveTab('list')}
                    >
                        목록/버전 관리
                    </button>
                </div>

                {activeTab === 'import' && (
                    <Card>
                        <CardHeader><h2 className="text-xl font-semibold">테스트 정의 임포트</h2></CardHeader>
                        <CardContent>
                            <form onSubmit={handleImportSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Code</label>
                                    <Input type="text" name="code" value={importForm.code} onChange={handleImportChange} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Title</label>
                                    <Input type="text" name="title" value={importForm.title} onChange={handleImportChange} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Version</label>
                                    <Input type="number" name="version" value={importForm.version} onChange={handleImportChange} required min="1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Questions JSON</label>
                                    <textarea name="questions" value={importForm.questions} onChange={handleImportChange} required rows={10} className="w-full p-2 border rounded-md bg-background text-foreground"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Scoring JSON</label>
                                    <textarea name="scoring" value={importForm.scoring} onChange={handleImportChange} required rows={10} className="w-full p-2 border rounded-md bg-background text-foreground"></textarea>
                                </div>
                                <Button type="submit" isLoading={isImporting}>임포트</Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'list' && (
                    <Card>
                        <CardHeader><h2 className="text-xl font-semibold">테스트 정의 목록</h2></CardHeader>
                        <CardContent>
                            {isListLoading ? (
                                <div className="flex flex-col gap-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : listError ? (
                                <EmptyState title="목록을 불러오는데 실패했습니다." description={listError} icon="⚠️" />
                            ) : testDefs.length === 0 ? (
                                <EmptyState title="임포트된 테스트 정의가 없습니다." description="JSON 임포트 탭에서 새로운 테스트를 추가해주세요." icon="📄" />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-border">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Code</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Version</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Title</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Status</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {testDefs.map((def) => (
                                                <tr key={def.id}>
                                                    <td className="px-4 py-2 whitespace-nowrap">{def.code}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap">{def.version}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap">{def.title}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap">
                                                        <Badge variant={def.status === 'PUBLISHED' ? 'default' : def.status === 'DRAFT' ? 'secondary' : 'outline'}>
                                                            {def.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap space-x-2">
                                                        {def.status === 'DRAFT' && (
                                                            <Button size="sm" onClick={() => handlePublish(def.code, def.version)}>발행</Button>
                                                        )}
                                                        <Button size="sm" variant="outline" onClick={() => handleViewDetail(def.code, def.version)}>상세보기</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {isDetailModalOpen && selectedTestDef && (
                    <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} className="max-w-4xl">
                        <Card>
                            <CardHeader><h2 className="text-xl font-semibold">테스트 정의 상세</h2></CardHeader>
                            <CardContent>
                                <p><strong>Code:</strong> {selectedTestDef.code}</p>
                                <p><strong>Version:</strong> {selectedTestDef.version}</p>
                                <p><strong>Title:</strong> {selectedTestDef.title}</p>
                                <p><strong>Status:</strong> {selectedTestDef.status}</p>
                                <p><strong>Created At:</strong> {new Date(selectedTestDef.createdAt).toLocaleString()}</p>
                                <p><strong>Updated At:</strong> {new Date(selectedTestDef.updatedAt).toLocaleString()}</p>
                                <h3 className="text-lg font-semibold mt-4">Questions JSON</h3>
                                <pre className="bg-muted p-2 rounded-md overflow-auto text-sm">{JSON.stringify(JSON.parse(selectedTestDef.questions), null, 2)}</pre>
                                <h3 className="text-lg font-semibold mt-4">Scoring JSON</h3>
                                <pre className="bg-muted p-2 rounded-md overflow-auto text-sm">{JSON.stringify(JSON.parse(selectedTestDef.scoring), null, 2)}</pre>
                            </CardContent>
                            <CardFooter className="flex justify-end">
                                <Button onClick={() => setIsDetailModalOpen(false)}>닫기</Button>
                            </CardFooter>
                        </Card>
                    </Modal>
                )}
            </div>
        </>
    );
}

export default AdminTests;
