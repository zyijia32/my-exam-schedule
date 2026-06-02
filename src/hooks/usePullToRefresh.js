import { useEffect, useRef, useState } from 'react'

export function usePullToRefresh(onRefresh, { threshold = 72, enabled = true } = {}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullDistanceRef = useRef(0)
  const pullingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined
    }

    const onTouchStart = (event) => {
      if (window.scrollY > 4 || isRefreshing) {
        return
      }
      startYRef.current = event.touches[0].clientY
      pullingRef.current = true
    }

    const onTouchMove = (event) => {
      if (!pullingRef.current || window.scrollY > 4 || isRefreshing) {
        return
      }
      const distance = Math.max(0, event.touches[0].clientY - startYRef.current)
      pullDistanceRef.current = Math.min(distance, threshold * 1.5)
      setPullDistance(pullDistanceRef.current)
    }

    const onTouchEnd = async () => {
      if (!pullingRef.current) {
        return
      }
      pullingRef.current = false
      const shouldRefresh = pullDistanceRef.current >= threshold && !isRefreshing
      pullDistanceRef.current = 0
      setPullDistance(0)
      if (!shouldRefresh) {
        return
      }
      setIsRefreshing(true)
      try {
        await onRefreshRef.current()
      } finally {
        window.setTimeout(() => setIsRefreshing(false), 400)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [enabled, isRefreshing, threshold])

  return {
    pullDistance,
    isRefreshing,
    isPulling: pullDistance > 0,
  }
}
