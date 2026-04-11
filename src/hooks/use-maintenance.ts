'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { SiteConfig } from '@/types'

interface MaintenanceState {
  isMaintenanceMode: boolean
  maintenanceMessage: string | null
  isLoading: boolean
  error: string | null
}

interface UseMaintenanceReturn extends MaintenanceState {
  checkMaintenance: () => Promise<void>
  redirectIfMaintenance: () => Promise<boolean>
}

/**
 * Hook for checking maintenance mode status
 * Can be used to check maintenance mode and redirect accordingly
 */
export function useMaintenance(): UseMaintenanceReturn {
  const router = useRouter()
  const [state, setState] = useState<MaintenanceState>({
    isMaintenanceMode: false,
    maintenanceMessage: null,
    isLoading: true,
    error: null,
  })

  const checkMaintenance = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch('/api/maintenance/status')
      const result = await response.json()

      if (result.success) {
        setState({
          isMaintenanceMode: result.data.maintenanceMode ?? false,
          maintenanceMessage: result.data.maintenanceMessage,
          isLoading: false,
          error: null,
        })
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to check maintenance status',
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }))
    }
  }, [])

  const redirectIfMaintenance = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/maintenance/status')
      const result = await response.json()

      if (result.success && result.data.maintenanceMode) {
        router.push('/maintenance')
        return true
      }

      return false
    } catch {
      return false
    }
  }, [router])

  useEffect(() => {
    checkMaintenance()
  }, [checkMaintenance])

  return {
    ...state,
    checkMaintenance,
    redirectIfMaintenance,
  }
}

/**
 * Hook for fetching full site config
 * Useful for components that need more than just maintenance status
 */
export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/site-config')
      const result = await response.json()

      if (result.success) {
        setConfig(result.data)
      } else {
        setError(result.error || 'Failed to fetch site config')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  return {
    config,
    isLoading,
    error,
    refetch: fetchConfig,
  }
}
