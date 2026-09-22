"use client";

import { LogOut, Lock } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "@/interfaces/user";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/auth.context";
import { Button } from "../ui/button";
import { PasswordResetDialog } from '@/components/common/PasswordResetDialog';
import { safeParse } from "@/services/auth-service";

export function NavUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const user = safeParse(localStorage.getItem("user"));
    setUser(user);
  }, []);


  const getProfilePictureUrl = () => {
    if (!user?.profile_picture) return null;

    // If profile_picture is already a full URL (starts with http/https), use it as is
    if (user.profile_picture.startsWith('http://') || user.profile_picture.startsWith('https://')) {
      return user.profile_picture;
    }

    // Otherwise, construct the URL with API_URL
    return `${API_URL}/uploads/users/${user.profile_picture}`;
  };

  const profilePicUrl = getProfilePictureUrl();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 w-9 cursor-pointer rounded-full p-0 hover:bg-accent/10 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <Avatar className="h-8 w-8 !ring-0 !border-0">
              <AvatarImage
                src={profilePicUrl || undefined}
                alt={`${user?.first_name || ''} ${user?.last_name || ''}`}
                className="object-cover"
              />
              <AvatarFallback className="text-sm bg-primary font-semibold">
                {`${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setIsPasswordOpen(true)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800">
            <Lock strokeWidth={1.5} className="h-4 w-4 text-current" />
            <span>Change Password</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:text-destructive hover:text-destructive hover:bg-destructive/10 focus:bg-destructive/10">
          <LogOut strokeWidth={1.5} className="text-destructive h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      <PasswordResetDialog
        open={isPasswordOpen}
        onOpenChange={setIsPasswordOpen}
      />
    </DropdownMenu>
  );
}

