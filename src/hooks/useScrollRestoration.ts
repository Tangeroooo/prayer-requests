import { useEffect, useRef, useState, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const STORAGE_PREFIX = 'prayer-requests:ui'

const buildStorageKey = (key: string) => `${STORAGE_PREFIX}:${key}`

const removeSessionStorage = (key: string) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.removeItem(buildStorageKey(key))
  } catch (error) {
    console.error('Failed to remove session storage state:', error)
  }
}

const readSessionStorage = <T>(key: string, fallbackValue: T) => {
  if (typeof window === 'undefined') {
    return fallbackValue
  }

  try {
    const savedValue = window.sessionStorage.getItem(buildStorageKey(key))
    return savedValue ? (JSON.parse(savedValue) as T) : fallbackValue
  } catch (error) {
    console.error('Failed to read session storage state:', error)
    return fallbackValue
  }
}

const writeSessionStorage = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(buildStorageKey(key), JSON.stringify(value))
  } catch (error) {
    console.error('Failed to write session storage state:', error)
  }
}

const scheduleWindowScrollRestore = (storageKey: string) => {
  const savedPosition = window.sessionStorage.getItem(storageKey)

  if (!savedPosition) {
    return null
  }

  const targetPosition = Number.parseInt(savedPosition, 10)

  if (Number.isNaN(targetPosition)) {
    return null
  }

  let cancelled = false
  let attempts = 0

  const restoreScroll = () => {
    if (cancelled) {
      return
    }

    window.scrollTo(0, targetPosition)

    if (Math.abs(window.scrollY - targetPosition) <= 2 || attempts >= 10) {
      return
    }

    attempts += 1
    window.setTimeout(restoreScroll, 80)
  }

  const timeoutId = window.setTimeout(restoreScroll, 0)

  return () => {
    cancelled = true
    window.clearTimeout(timeoutId)
  }
}

export function useSessionStorageState<T>(
  key: string,
  initialValue: T,
  options?: { resetOnReload?: boolean }
) {
  const location = useLocation()
  const shouldResetOnReload = Boolean(options?.resetOnReload) && location.key === 'default'
  const [state, setState] = useState<T>(() => {
    if (shouldResetOnReload) {
      removeSessionStorage(key)
      return initialValue
    }

    return readSessionStorage(key, initialValue)
  })

  useEffect(() => {
    writeSessionStorage(key, state)
  }, [key, state])

  return [state, setState] as const
}

export function useWindowScrollRestoration(
  key: string | null,
  options?: {
    isReady?: boolean
    resetOnEnter?: boolean
    resetOnReload?: boolean
    restoreOnPop?: boolean
  }
) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const isReady = options?.isReady ?? true
  const resetOnEnter = options?.resetOnEnter ?? false
  const resetOnReload = options?.resetOnReload ?? false
  const restoreOnPop = options?.restoreOnPop ?? false
  const shouldResetOnReload = resetOnReload && location.key === 'default'
  const storageKey = key ? buildStorageKey(`${key}:scroll-y`) : null
  const hasHandledEntryRef = useRef(false)

  useEffect(() => {
    if (!storageKey) {
      return
    }

    let frameId: number | null = null

    const persistScroll = () => {
      window.sessionStorage.setItem(storageKey, window.scrollY.toString())
    }

    const handleScroll = () => {
      if (frameId !== null) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        persistScroll()
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      persistScroll()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [storageKey])

  useEffect(() => {
    if (!isReady || hasHandledEntryRef.current) {
      return
    }

    hasHandledEntryRef.current = true

    if (storageKey && shouldResetOnReload) {
      removeSessionStorage(`${key}:scroll-y`)
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }

    if (storageKey && restoreOnPop && navigationType === 'POP') {
      const cancelRestore = scheduleWindowScrollRestore(storageKey)

      if (cancelRestore) {
        return cancelRestore
      }
    }

    if (resetOnEnter) {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [
    isReady,
    key,
    navigationType,
    resetOnEnter,
    restoreOnPop,
    shouldResetOnReload,
    storageKey,
  ])
}

export function useScrollToTopOnEnter(isReady = true) {
  const hasResetRef = useRef(false)

  useEffect(() => {
    if (!isReady || hasResetRef.current) {
      return
    }

    hasResetRef.current = true
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [isReady])
}

export function useElementScrollRestoration<T extends HTMLElement>(
  ref: RefObject<T | null>,
  key: string,
  enabled = true
) {
  const storageKey = buildStorageKey(`${key}:scroll-x`)
  const hasRestoredRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const element = ref.current

    if (!element) {
      return
    }

    let frameId: number | null = null

    const persistScroll = () => {
      window.sessionStorage.setItem(storageKey, element.scrollLeft.toString())
    }

    const handleScroll = () => {
      if (frameId !== null) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        persistScroll()
      })
    }

    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      persistScroll()
      element.removeEventListener('scroll', handleScroll)
    }
  }, [enabled, ref, storageKey])

  useEffect(() => {
    if (!enabled || hasRestoredRef.current) {
      return
    }

    const element = ref.current

    if (!element) {
      return
    }

    hasRestoredRef.current = true

    const savedPosition = window.sessionStorage.getItem(storageKey)

    if (!savedPosition) {
      return
    }

    const targetPosition = Number.parseInt(savedPosition, 10)

    if (Number.isNaN(targetPosition)) {
      return
    }

    element.scrollLeft = targetPosition
  }, [enabled, ref, storageKey])
}
