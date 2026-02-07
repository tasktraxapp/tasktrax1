'use client';

import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce'; // Optional: Install via `npm i use-debounce` if you have it, otherwise see simpler version below

export function Search() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Handle Input Changes (Debounced to prevent URL thrashing)
  // If you don't have 'use-debounce', remove this wrapper and just use the logic inside directly
  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (term) {
      params.set('search', term);
    } else {
      params.delete('search');
    }
    
    // Updates the URL without refreshing the page
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative w-full max-w-[300px]">
        <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search tasks..."
        className="pl-8 md:w-[200px] lg:w-[300px] h-9"
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('search')?.toString()}
      />
    </div>
  );
}