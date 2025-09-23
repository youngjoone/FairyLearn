import { useEffect, useState } from 'react';
import useApi from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/ToastProvider';

interface CommentDto {
  id: number;
  parentId: number | null;
  authorNickname: string | null;
  authorId: number | null;
  editable: boolean;
  deleted: boolean;
  content: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  createdAt: string;
  replies: CommentDto[];
}

interface SharedStoryCommentsProps {
  slug: string;
  onCountChange?: (count: number) => void;
}

const SharedStoryComments: React.FC<SharedStoryCommentsProps> = ({ slug, onCountChange }) => {
  const { fetchWithErrorHandler } = useApi();
  const { isLoggedIn } = useAuth();
  const { addToast } = useToast();

  const [comments, setComments] = useState<CommentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await fetchWithErrorHandler<any[]>(
        `/public/shared-stories/${slug}/comments`
      );
      const normalized = data.map(normalizeComment);
      setComments(normalized);
      onCountChange?.(countActive(normalized));
    } catch (error) {
      console.error('[SharedStoryComments] load error', error);
      addToast('댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const countActive = (items: CommentDto[]): number => {
    return items.reduce((acc, item) => {
      const self = item.deleted ? 0 : 1;
      return acc + self + countActive(item.replies || []);
    }, 0);
  };

  const normalizeComment = (raw: any): CommentDto => {
    const replies = Array.isArray(raw.replies) ? raw.replies.map(normalizeComment) : [];
    return {
      id: raw.id,
      parentId: raw.parentId ?? raw.parent_id ?? null,
      authorNickname: raw.authorNickname ?? raw.author_nickname ?? null,
      authorId: raw.authorId ?? raw.author_id ?? null,
      editable: Boolean(raw.editable),
      deleted: Boolean(raw.deleted),
      content: raw.content ?? '',
      likeCount: raw.likeCount ?? raw.like_count ?? 0,
      likedByCurrentUser: raw.likedByCurrentUser ?? raw.liked_by_current_user ?? false,
      createdAt: raw.createdAt ?? raw.created_at ?? '',
      replies,
    };
  };

  const requireLogin = () => {
    if (!isLoggedIn) {
      addToast('로그인한 사용자만 이용할 수 있습니다.', 'info');
      return false;
    }
    return true;
  };

  const handleCreateComment = async (parentId: number | null, content: string, reset: () => void) => {
    if (!requireLogin()) return;
    const trimmed = content.trim();
    if (!trimmed) {
      addToast('댓글 내용을 입력해 주세요.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetchWithErrorHandler(`/public/shared-stories/${slug}/comments`, {
        method: 'POST',
        body: { content: trimmed, parent_comment_id: parentId },
      });
      reset();
      setReplyTargetId(null);
      setReplyText('');
      await loadComments();
      addToast('댓글이 등록되었습니다.', 'success');
    } catch (error) {
      console.error('[SharedStoryComments] create error', error);
      addToast('댓글을 등록하지 못했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!requireLogin()) return;
    const trimmed = editText.trim();
    if (!trimmed) {
      addToast('댓글 내용을 입력해 주세요.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetchWithErrorHandler(`/public/shared-stories/${slug}/comments/${commentId}`, {
        method: 'PATCH',
        body: { content: trimmed },
      });
      setEditingCommentId(null);
      setEditText('');
      await loadComments();
      addToast('댓글이 수정되었습니다.', 'success');
    } catch (error) {
      console.error('[SharedStoryComments] update error', error);
      addToast('댓글을 수정하지 못했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!requireLogin()) return;
    setIsSubmitting(true);
    try {
      await fetchWithErrorHandler(`/public/shared-stories/${slug}/comments/${commentId}`, {
        method: 'DELETE',
      });
      await loadComments();
      addToast('댓글이 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('[SharedStoryComments] delete error', error);
      addToast('댓글을 삭제하지 못했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCommentLike = async (commentId: number) => {
    if (!requireLogin()) return;
    try {
      const response = await fetchWithErrorHandler<{ commentId: number; likeCount: number; liked: boolean }>(
        `/public/shared-stories/${slug}/comments/${commentId}/likes`,
        { method: 'POST' }
      );
      setComments(prev => updateCommentTree(prev, commentId, comment => ({
        ...comment,
        likeCount: response.likeCount ?? comment.likeCount,
        likedByCurrentUser: response.liked,
      })));
    } catch (error) {
      console.error('[SharedStoryComments] like toggle error', error);
      addToast('댓글 좋아요 처리에 실패했습니다.', 'error');
    }
  };

  const updateCommentTree = (
    nodes: CommentDto[],
    commentId: number,
    updater: (comment: CommentDto) => CommentDto
  ): CommentDto[] => {
    return nodes.map(node => {
      if (node.id === commentId) {
        return updater({ ...node, replies: [...node.replies] });
      }
      if (node.replies.length > 0) {
        const updatedReplies = updateCommentTree(node.replies, commentId, updater);
        if (updatedReplies !== node.replies) {
          return { ...node, replies: updatedReplies };
        }
      }
      return node;
    });
  };

  const renderComment = (comment: CommentDto, depth = 0) => {
    const isEditing = editingCommentId === comment.id;
    const isReplying = replyTargetId === comment.id;
    const createdDate = comment.createdAt ? new Date(comment.createdAt) : null;
    const createdLabel = createdDate && !Number.isNaN(createdDate.getTime())
      ? createdDate.toLocaleString()
      : '';
    return (
      <div key={comment.id} className={`flex flex-col gap-2 ${depth > 0 ? 'ml-6' : ''}`}>
        <div className="rounded-md border border-border p-4 bg-card space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{comment.authorNickname || '익명 사용자'}</span>
              {createdLabel && (
                <span className="text-xs text-muted-foreground">
                  {createdLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => handleToggleCommentLike(comment.id)}
                className={`flex items-center gap-1 ${comment.likedByCurrentUser ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500 transition-colors`}
              >
                <span>{comment.likedByCurrentUser ? '❤' : '🤍'}</span>
                <span>{comment.likeCount}</span>
              </button>
              {!comment.deleted && isLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    setReplyTargetId(comment.id);
                    setReplyText('');
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  답글
                </button>
              )}
              {!comment.deleted && comment.editable && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditText(comment.content);
                    }}
                    className="text-muted-foreground hover:text-primary"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={isSubmitting}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
          {comment.deleted ? (
            <p className="text-sm text-muted-foreground italic">{comment.content}</p>
          ) : isEditing ? (
            <div className="space-y-2">
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => handleUpdateComment(comment.id)} disabled={isSubmitting}>
                  저장
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditText('');
                  }}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{comment.content}</p>
          )}
        </div>
        {isReplying && (
          <div className={`ml-6 mt-2 ${depth > 0 ? '' : ''}`}>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder="답글을 입력하세요"
            />
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" onClick={() => handleCreateComment(comment.id, replyText, () => setReplyText(''))} disabled={isSubmitting}>
                등록
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setReplyTargetId(null);
                  setReplyText('');
                }}
                disabled={isSubmitting}
              >
                취소
              </Button>
            </div>
          </div>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-4 mt-4">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">댓글</h3>
        {isLoggedIn ? (
          <div className="space-y-2">
            <textarea
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="댓글을 입력하세요"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={() => handleCreateComment(null, newComment, () => setNewComment(''))} disabled={isSubmitting}>
                등록
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">댓글을 작성하려면 로그인해 주세요.</p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">첫 댓글을 작성해보세요!</p>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  );
};

export default SharedStoryComments;
