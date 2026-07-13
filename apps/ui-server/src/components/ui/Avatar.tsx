import React from 'react';
import { User } from 'lucide-react';
import './Avatar.css';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  className?: string;
}

export default function Avatar({
  src,
  alt = 'Avatar',
  initials,
  size = 'md',
  shape = 'circle',
  className = ''
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const getInitials = () => {
    if (initials) return initials.substring(0, 2).toUpperCase();
    if (alt && alt !== 'Avatar') {
      const parts = alt.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return alt.substring(0, 2).toUpperCase();
    }
    return null;
  };

  const showImage = src && !imageError;
  const chars = getInitials();

  return (
    <div className={`ui-avatar size-${size} shape-${shape} ${className}`}>
      {showImage ? (
        <img 
          src={src} 
          alt={alt} 
          className="ui-avatar-image" 
          onError={() => setImageError(true)} 
        />
      ) : chars ? (
        <span className="ui-avatar-initials">{chars}</span>
      ) : (
        <User className="ui-avatar-icon" />
      )}
    </div>
  );
}
