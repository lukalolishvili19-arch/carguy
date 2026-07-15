'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import type { Comment, Paginated, Post } from '@/lib/types';

export function useFeed(
  scope: 'public' | 'personalized' = 'public',
  authorUsername?: string,
) {
  return useInfiniteQuery({
    queryKey: ['feed', scope, authorUsername ?? null],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      unwrap<Paginated<Post>>(
        api.get(scope === 'personalized' ? '/posts/feed' : '/posts', {
          params: { page: pageParam, limit: 10, authorUsername },
        }),
      ),
    getNextPageParam: (last) => (last.meta.hasNextPage ? last.meta.page + 1 : undefined),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { content?: string; type?: string; media?: { url: string }[]; hashtags?: string[] }) =>
      unwrap<Post>(api.post('/posts', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => unwrap<{ liked: boolean }>(api.post(`/posts/${postId}/like`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useToggleBookmark() {
  return useMutation({
    mutationFn: (postId: string) =>
      unwrap<{ bookmarked: boolean }>(api.post(`/posts/${postId}/bookmark`)),
  });
}

export function useComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['comments', postId],
    enabled,
    queryFn: () =>
      unwrap<Paginated<Comment>>(api.get(`/posts/${postId}/comments`, { params: { limit: 50 } })),
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { content?: string; imageUrl?: string }) =>
      unwrap<Comment>(api.post(`/posts/${postId}/comments`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
