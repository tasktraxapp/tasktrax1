'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ✅ REPLACED: LogoIcon now uses your favicon instead of the w3.org SVG
export const LogoIcon = ({ className }: { className?: string }) => (
  <img 
    src="/favicon.ico" 
    alt="TaskTrax Icon" 
    className={cn("h-10 w-10 object-contain", className)} 
  />
);

export const Logo = ({ 
    className, 
    iconClassName, 
    urlOverride 
}: { 
    className?: string, 
    iconClassName?: string, 
    textClassName?: string, // Kept for compatibility, though unused in image-only mode
    urlOverride?: string
}) => {
    // Default to favicon if no URL is provided
    const activeLogoUrl = urlOverride; 
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [activeLogoUrl]);

    return (
        <div className={cn("flex items-center gap-4", className)}>
            {/* ✅ LOGIC: Try to show the Big Logo (urlOverride). If it fails or isn't provided, show Favicon. */}
            {activeLogoUrl && !imgError ? (
                <img 
                    src={activeLogoUrl} 
                    alt="Company Logo" 
                    className={cn(
                        "h-32 w-auto object-contain transition-opacity duration-300", 
                        iconClassName
                    )} 
                    onError={() => setImgError(true)} 
                />
            ) : (
                <LogoIcon className={iconClassName} />
            )}
        </div>
    );
};