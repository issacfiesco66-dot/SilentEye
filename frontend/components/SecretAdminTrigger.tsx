'use client';

import { useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function SecretAdminTrigger({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const clickCount = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    clickCount.current += 1;
    if (timer.current) clearTimeout(timer.current);
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      router.push('/login?mode=admin');
      return;
    }
    timer.current = setTimeout(() => {
      clickCount.current = 0;
    }, 1500);
  }, [router]);

  return (
    <div onClick={handleClick} className="cursor-default select-none">
      {children}
    </div>
  );
}
