'use client';

import { useState, useEffect } from 'react';

export function PrintHeader({ title }: { title: string }) {
  const [printDateTime, setPrintDateTime] = useState<string | null>(null);

  useEffect(() => {
    const updateDateTime = () => {
      setPrintDateTime(new Date().toLocaleString());
    };

    window.addEventListener('beforeprint', updateDateTime);
    
    // Set initial value
    updateDateTime();

    return () => {
      window.removeEventListener('beforeprint', updateDateTime);
    };
  }, []);

  return (
    <div className="print-only">
      <h1 className="font-headline text-xl font-bold mb-2">{title}</h1>
      {printDateTime && <p className="text-xs mb-4">Printed on: {printDateTime}</p>}
    </div>
  );
}
