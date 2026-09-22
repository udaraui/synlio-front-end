import { UserCircle } from 'lucide-react';

interface ProfileImageProps {

  profileImage?: string | null;

  userName: string;

  size?: 'sm' | 'md' | 'lg';

}

// ProfileImage component for displaying user profile images

export const ProfileImage = ({ profileImage, userName, size = 'md' }: ProfileImageProps) => {

  const sizeClasses = {

    sm: 'w-8 h-8',

    md: 'w-10 h-10',

    lg: 'w-12 h-12',

  };

  const iconSizes = {

    sm: 'w-4 h-4',

    md: 'w-5 h-5',

    lg: 'w-6 h-6',

  };

  if (profileImage && profileImage.trim() !== '') {

    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-muted flex-shrink-0 border border-border`}>
        <img

          src={profileImage}

          alt={`${userName}'s profile`}

          className="w-full h-full object-cover"

          onError={(e) => {

            // If image fails to load, replace with default icon

            const target = e.target as HTMLImageElement;

            target.style.display = 'none';

            const parent = target.parentElement;

            if (parent) {

              parent.innerHTML = `<div class="w-full h-full bg-muted/50 flex items-center justify-center">
<svg class="${iconSizes[size]} text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
</svg>
</div>`;

            }

          }}

        />
      </div>

    );

  }

  // Default profile icon when no image is provided

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-muted/50 flex items-center justify-center border border-border flex-shrink-0`}>
      <UserCircle className={`${iconSizes[size]} text-muted-foreground`} />
    </div>

  );

};
