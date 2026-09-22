import { useSidebar } from "@/components/ui/sidebar"

export function CustomSidebarTrigger() {
  const { toggleSidebar } = useSidebar()

  return <button onClick={toggleSidebar} >Toggle Sidebar</button>
}
