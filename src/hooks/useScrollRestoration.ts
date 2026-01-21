import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SCROLL_KEY = 'scroll_position'

export function useScrollRestoration() {
  const location = useLocation()

  useEffect(() => {
    // 홈페이지일 때만 스크롤 복원
    if (location.pathname === '/' || location.pathname === '') {
      const savedPosition = sessionStorage.getItem(SCROLL_KEY)
      if (savedPosition) {
        // 약간의 지연 후 스크롤 복원 (DOM 렌더링 대기)
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition, 10))
        }, 100)
        sessionStorage.removeItem(SCROLL_KEY)
      }
    }
  }, [location.pathname])
}

export function saveScrollPosition() {
  sessionStorage.setItem(SCROLL_KEY, window.scrollY.toString())
}
