"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'

export interface BreadcrumbSibling {
  id: number
  label: string
  href: string
  isCurrent?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
  isCurrentPage?: boolean
  levelName?: string // e.g., "Initiative", "Program", "Task"
  siblings?: BreadcrumbSibling[] // Other items at the same level
}

interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[]
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void
  /** Optional callback registered by the current page to handle back navigation directly
   *  (e.g. pop the parentTaskStack without any extra API calls). */
  onBack?: () => void
  setOnBack: (fn: (() => void) | undefined) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined)

export const BreadcrumbProvider = ({ children }: { children: ReactNode }) => {
  const [breadcrumbs, setBreadcrumbsState] = useState<BreadcrumbItem[]>([])
  // Store function-as-state requires the () => fn wrapper so React doesn't
  // mistake the function for a state updater.
  const [onBack, setOnBackState] = useState<(() => void) | undefined>(undefined)

  const setBreadcrumbs = useCallback((newBreadcrumbs: BreadcrumbItem[]) => {
    setBreadcrumbsState(newBreadcrumbs)
  }, [])

  const setOnBack = useCallback((fn: (() => void) | undefined) => {
    setOnBackState(() => fn)
  }, [])

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs, onBack, setOnBack }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider')
  }
  return context
}
