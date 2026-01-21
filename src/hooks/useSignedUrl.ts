import { useState, useEffect } from 'react'
import { getSignedPhotoUrl } from '@/lib/supabase'

// 메모리 캐시 (세션 동안 유지)
const urlCache = new Map<string, { url: string; expiry: number }>()

export function useSignedUrl(path: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!path) {
      setSignedUrl(null)
      return
    }

    // 이미 http URL이면 그대로 사용
    if (path.startsWith('http')) {
      setSignedUrl(path)
      return
    }

    // 캐시 확인 (만료 10분 전까지 유효)
    const cached = urlCache.get(path)
    if (cached && cached.expiry > Date.now() + 600000) {
      setSignedUrl(cached.url)
      return
    }

    // Signed URL 가져오기
    setIsLoading(true)
    getSignedPhotoUrl(path)
      .then((url) => {
        if (url) {
          // 50분 후 만료로 캐시 (실제 만료는 60분)
          urlCache.set(path, { url, expiry: Date.now() + 3000000 })
          setSignedUrl(url)
        }
      })
      .finally(() => setIsLoading(false))
  }, [path])

  return { signedUrl, isLoading }
}
