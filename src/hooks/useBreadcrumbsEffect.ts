import { useEffect, useMemo } from 'react'
import { useBreadcrumb, BreadcrumbItem } from '@/contexts/breadcrumb.context'

/**
 * Custom hook to set breadcrumbs for a page
 * 
 * IMPORTANT: This hook MUST be called at the very top of your component,
 * before any conditional logic or early returns to follow the Rules of Hooks.
 * 
 * @param breadcrumbs - Array of breadcrumb items to set
 * 
 * @example
 * ```tsx
 * const MyPage = () => {
 *   // CORRECT: Called at the very top
 *   useBreadcrumbsEffect([
 *     { label: "Home", href: "/" },
 *     { label: "Current Page", isCurrentPage: true }
 *   ]);
 * 
 *   const [loading, setLoading] = useState(false);
 * 
 *   if (loading) {
 *     return <Loading />; // Safe to return after hooks
 *   }
 * 
 *   return <div>Content</div>;
 * };
 * ```
 */
export const useBreadcrumbsEffect = (breadcrumbs: BreadcrumbItem[]) => {
  const { setBreadcrumbs } = useBreadcrumb()
  
  // Memoize the breadcrumbs array to prevent infinite re-renders
  const memoizedBreadcrumbs = useMemo(() => breadcrumbs, [
    JSON.stringify(breadcrumbs)
  ])

  useEffect(() => {
    setBreadcrumbs(memoizedBreadcrumbs)
  }, [setBreadcrumbs, memoizedBreadcrumbs])
}
