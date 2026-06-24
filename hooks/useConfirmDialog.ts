'use client'
import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolver?.(true)
    setOptions(null)
    setResolver(null)
  }, [resolver])

  const handleCancel = useCallback(() => {
    resolver?.(false)
    setOptions(null)
    setResolver(null)
  }, [resolver])

  return {
    isOpen: options !== null,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
