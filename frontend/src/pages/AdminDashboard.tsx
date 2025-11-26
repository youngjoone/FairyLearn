import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import useApi from '@/hooks/useApi';
import Meta from '@/lib/seo';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/FormControls/Input';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

type AdminUser = {
  id: number;
  email: string;
  name: string;
  provider: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  deleted: boolean;
  createdAt: string;
};

type AdminStory = {
  id: number;
  title: string;
  userId: string;
  language: string;
  hidden: boolean;
  deleted: boolean;
  shareSlug?: string | null;
  shareHidden?: boolean;
  createdAt: string;
};

type AdminOrder = {
  id: number;
  userId: number;
  productCode: string;
  productName?: string | null;
  quantity: number;
  pricePerUnit: number;
  totalAmount?: number | null;
  status: string;
  requestedAt?: string | null;
  paidAt?: string | null;
};

type AdminComment = {
  id: number;
  parentId?: number | null;
  authorId?: number | null;
  authorNickname?: string | null;
  content: string;
  deleted: boolean;
  shareSlug?: string | null;
  createdAt: string;
};

type HeartTransaction = {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
};

type TabKey = 'users' | 'stories' | 'orders' | 'comments' | 'hearts';

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { fetchWithErrorHandler } = useApi();
  const [activeTab, setActiveTab] = useState<TabKey>('users');

  const isAdmin = useMemo(() => {
    const role = profile?.role || '';
    return role.includes('ADMIN');
  }, [profile]);

  // Users
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const loadUsers = async () => {
    setUserLoading(true);
    setUserError(null);
    try {
      const data = await fetchWithErrorHandler<PageResponse<AdminUser>>(
        `/admin/users?query=${encodeURIComponent(userQuery)}&page=0&size=20`
      );
      const normalized = (data.content || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        provider: u.provider,
        role: u.role,
        status: (u.status || u.user_status || 'ACTIVE') as AdminUser['status'],
        deleted: Boolean(u.deleted ?? u.is_deleted),
        createdAt: u.createdAt || u.created_at || '',
      }));
      setUsers(normalized);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : '사용자 목록을 불러오지 못했습니다.');
    } finally {
      setUserLoading(false);
    }
  };

  const toggleUserStatus = async (user: AdminUser) => {
    await fetchWithErrorHandler<AdminUser>(`/admin/users/${user.id}`, {
      method: 'PATCH',
      body: { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
    });
    loadUsers();
  };

  const toggleUserDeleted = async (user: AdminUser) => {
    await fetchWithErrorHandler<AdminUser>(`/admin/users/${user.id}`, {
      method: 'PATCH',
      body: { deleted: !user.deleted },
    });
    loadUsers();
  };

  // Hearts
  const [heartUserId, setHeartUserId] = useState('');
  const [heartDelta, setHeartDelta] = useState(0);
  const [heartReason, setHeartReason] = useState('');
  const [heartResult, setHeartResult] = useState<HeartTransaction | null>(null);
  const [heartError, setHeartError] = useState<string | null>(null);
  const [heartLoading, setHeartLoading] = useState(false);

  const submitHeartAdjust = async () => {
    if (!heartUserId || heartDelta === 0) {
      setHeartError('유저 ID와 증감값을 입력하세요.');
      return;
    }
    setHeartLoading(true);
    setHeartError(null);
    try {
      const tx = await fetchWithErrorHandler<HeartTransaction>(`/admin/users/${heartUserId}/hearts`, {
        method: 'POST',
        body: { delta: heartDelta, reason: heartReason },
      });
      setHeartResult(tx);
    } catch (err) {
      setHeartError(err instanceof Error ? err.message : '하트 조정에 실패했습니다.');
    } finally {
      setHeartLoading(false);
    }
  };

  // Stories
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [storyQuery, setStoryQuery] = useState('');
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  const loadStories = async () => {
    setStoryLoading(true);
    setStoryError(null);
    try {
      const data = await fetchWithErrorHandler<PageResponse<AdminStory>>(
        `/admin/stories?query=${encodeURIComponent(storyQuery)}&page=0&size=20`
      );
      const normalized = (data.content || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        userId: s.userId || s.user_id,
        language: s.language,
        hidden: Boolean(s.hidden || s.is_hidden),
        deleted: Boolean(s.deleted || s.is_deleted),
        shareSlug: s.shareSlug || s.share_slug,
        shareHidden: Boolean(s.shareHidden || s.share_hidden),
        createdAt: s.createdAt || s.created_at || '',
      }));
      setStories(normalized);
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : '스토리 목록을 불러오지 못했습니다.');
    } finally {
      setStoryLoading(false);
    }
  };

  const updateStoryFlags = async (story: AdminStory, patch: Partial<Pick<AdminStory, 'hidden' | 'deleted'>>) => {
    await fetchWithErrorHandler<AdminStory>(`/admin/stories/${story.id}`, {
      method: 'PATCH',
      body: patch,
    });
    loadStories();
  };

  // Orders
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const loadOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await fetchWithErrorHandler<PageResponse<AdminOrder>>('/admin/billing/orders?page=0&size=20');
      const normalized = (data.content || []).map((o: any) => ({
        id: o.id,
        userId: o.userId ?? o.user_id,
        productCode: o.productCode ?? o.product_code,
        productName: o.productName ?? o.product_name,
        quantity: o.quantity ?? 0,
        pricePerUnit: o.pricePerUnit ?? o.price_per_unit ?? 0,
        totalAmount: o.totalAmount ?? o.total_amount ?? 0,
        status: o.status,
        requestedAt: o.requestedAt ?? o.requested_at ?? null,
        paidAt: o.paidAt ?? o.paid_at ?? null,
      }));
      setOrders(normalized);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : '결제 내역을 불러오지 못했습니다.');
    } finally {
      setOrdersLoading(false);
    }
  };

  // Comments
  const [commentSlug, setCommentSlug] = useState('');
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);

  const loadComments = async () => {
    if (!commentSlug) {
      setCommentError('슬러그를 입력하세요.');
      return;
    }
    setCommentLoading(true);
    setCommentError(null);
    try {
      const data = await fetchWithErrorHandler<AdminComment[]>(`/admin/shared-stories/${commentSlug}/comments`);
      setComments(data);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : '댓글을 불러오지 못했습니다.');
    } finally {
      setCommentLoading(false);
    }
  };

  const toggleCommentDeleted = async (comment: AdminComment) => {
    await fetchWithErrorHandler<AdminComment>(`/admin/shared-comments/${comment.id}`, {
      method: 'PATCH',
      body: { deleted: !comment.deleted },
    });
    loadComments();
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'stories') loadStories();
    if (activeTab === 'orders') loadOrders();
  }, [activeTab, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) {
    return (
      <EmptyState
        title="접근 권한이 없습니다."
        description="관리자 계정으로 로그인해주세요."
        icon="🔒"
      />
    );
  }

  const TabButton = ({ tab, label }: { tab: TabKey; label: string }) => (
    <Button
      variant={activeTab === tab ? 'primary' : 'ghost'}
      size="sm"
      onClick={() => setActiveTab(tab)}
    >
      {label}
    </Button>
  );

  return (
    <>
      <Meta title="관리자 대시보드" description="운영 도구" />
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <div className="flex gap-2 ml-auto">
            <TabButton tab="users" label="회원 관리" />
            <TabButton tab="stories" label="스토리 관리" />
            <TabButton tab="orders" label="결제 내역" />
            <TabButton tab="comments" label="댓글 관리" />
            <TabButton tab="hearts" label="하트 조정" />
          </div>
        </div>

        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="이메일/이름 검색"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={loadUsers}>조회</Button>
              </div>
            </CardHeader>
            <CardContent>
              {userLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : userError ? (
                <EmptyState title="회원 조회 실패" description={userError} icon="⚠️" />
              ) : users.length === 0 ? (
                <EmptyState title="회원 없음" description="검색 조건을 변경해보세요." icon="🧑‍💻" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">ID</th>
                        <th className="py-2 pr-4">이메일</th>
                        <th className="py-2 pr-4">이름</th>
                        <th className="py-2 pr-4">상태</th>
                        <th className="py-2 pr-4">삭제</th>
                        <th className="py-2 pr-4">권한</th>
                        <th className="py-2 pr-4">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b last:border-b-0">
                          <td className="py-2 pr-4">{u.id}</td>
                          <td className="py-2 pr-4">{u.email}</td>
                          <td className="py-2 pr-4">{u.name}</td>
                          <td className="py-2 pr-4">
                            <span className={u.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{u.deleted ? 'Y' : 'N'}</td>
                          <td className="py-2 pr-4">{u.role}</td>
                          <td className="py-2 pr-4 space-x-2">
                            <Button size="xs" variant="outline" onClick={() => toggleUserStatus(u)}>
                              {u.status === 'ACTIVE' ? '정지' : '해제'}
                            </Button>
                            <Button size="xs" variant="outline" onClick={() => toggleUserDeleted(u)}>
                              {u.deleted ? '복구' : '삭제'}
                            </Button>
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

        {activeTab === 'stories' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="제목 검색"
                  value={storyQuery}
                  onChange={(e) => setStoryQuery(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={loadStories}>조회</Button>
              </div>
            </CardHeader>
            <CardContent>
              {storyLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : storyError ? (
                <EmptyState title="스토리 조회 실패" description={storyError} icon="⚠️" />
              ) : stories.length === 0 ? (
                <EmptyState title="스토리 없음" description="검색 조건을 변경해보세요." icon="📚" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">ID</th>
                        <th className="py-2 pr-4">제목</th>
                        <th className="py-2 pr-4">작성자</th>
                        <th className="py-2 pr-4">숨김</th>
                        <th className="py-2 pr-4">삭제</th>
                        <th className="py-2 pr-4">공유</th>
                        <th className="py-2 pr-4">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stories.map((s) => (
                        <tr key={s.id} className="border-b last:border-b-0">
                          <td className="py-2 pr-4">{s.id}</td>
                          <td className="py-2 pr-4">{s.title}</td>
                          <td className="py-2 pr-4">{s.userId}</td>
                          <td className="py-2 pr-4">{s.hidden ? 'Y' : 'N'}</td>
                          <td className="py-2 pr-4">{s.deleted ? 'Y' : 'N'}</td>
                          <td className="py-2 pr-4">
                            {s.shareSlug ? `${s.shareSlug}${s.shareHidden ? ' (숨김)' : ''}` : '-'}
                          </td>
                          <td className="py-2 pr-4 space-x-2">
                            <Button size="xs" variant="outline" onClick={() => updateStoryFlags(s, { hidden: !s.hidden })}>
                              {s.hidden ? '노출' : '숨김'}
                            </Button>
                            <Button size="xs" variant="outline" onClick={() => updateStoryFlags(s, { deleted: !s.deleted })}>
                              {s.deleted ? '복구' : '삭제'}
                            </Button>
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

        {activeTab === 'orders' && (
          <Card>
            <CardHeader>결제 내역</CardHeader>
            <CardContent>
              {ordersLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : ordersError ? (
                <EmptyState title="결제 내역 조회 실패" description={ordersError} icon="⚠️" />
              ) : orders.length === 0 ? (
                <EmptyState title="주문 없음" description="조회된 결제 내역이 없습니다." icon="💳" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">ID</th>
                        <th className="py-2 pr-4">유저</th>
                        <th className="py-2 pr-4">상품</th>
                        <th className="py-2 pr-4">총액</th>
                        <th className="py-2 pr-4">상태</th>
                        <th className="py-2 pr-4">요청 시각</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-b last:border-b-0">
                          <td className="py-2 pr-4">{o.id}</td>
                          <td className="py-2 pr-4">{o.userId}</td>
                          <td className="py-2 pr-4">{o.productName || o.productCode}</td>
                          <td className="py-2 pr-4">{(o.totalAmount ?? 0).toLocaleString()}</td>
                          <td className="py-2 pr-4">{o.status}</td>
                          <td className="py-2 pr-4">
                            {o.requestedAt ? new Date(o.requestedAt).toLocaleString() : '-'}
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

        {activeTab === 'comments' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="공유 스토리 슬러그 입력"
                  value={commentSlug}
                  onChange={(e) => setCommentSlug(e.target.value)}
                  className="max-w-sm"
                />
                <Button onClick={loadComments}>댓글 조회</Button>
              </div>
            </CardHeader>
            <CardContent>
              {commentLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : commentError ? (
                <EmptyState title="댓글 조회 실패" description={commentError} icon="⚠️" />
              ) : comments.length === 0 ? (
                <EmptyState title="댓글 없음" description="슬러그를 확인하세요." icon="💬" />
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="border rounded-md p-3 flex justify-between items-start">
                      <div>
                        <div className="text-sm text-muted-foreground">#{c.id} / 작성자: {c.authorId ?? '-'} / {new Date(c.createdAt).toLocaleString()}</div>
                        <div className="font-semibold">{c.content}</div>
                        {c.parentId && <div className="text-xs text-muted-foreground">답글 to #{c.parentId}</div>}
                      </div>
                      <Button size="xs" variant="outline" onClick={() => toggleCommentDeleted(c)}>
                        {c.deleted ? '복구' : '삭제'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'hearts' && (
          <Card>
            <CardHeader>하트 증감</CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="유저 ID"
                  value={heartUserId}
                  onChange={(e) => setHeartUserId(e.target.value)}
                />
                <Input
                  placeholder="증감값 (예: 10 또는 -5)"
                  type="number"
                  value={heartDelta}
                  onChange={(e) => setHeartDelta(Number(e.target.value))}
                />
                <Input
                  placeholder="사유 (선택)"
                  value={heartReason}
                  onChange={(e) => setHeartReason(e.target.value)}
                />
              </div>
              <Button onClick={submitHeartAdjust} disabled={heartLoading}>
                {heartLoading ? '처리 중...' : '하트 조정'}
              </Button>
              {heartError && <div className="text-sm text-red-600">{heartError}</div>}
              {heartResult && (
                <div className="text-sm text-green-700">
                  트랜잭션 #{heartResult.id}: {heartResult.amount} → 잔액 {heartResult.balanceAfter}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default AdminDashboard;
