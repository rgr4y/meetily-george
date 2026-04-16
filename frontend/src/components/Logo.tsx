import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface LogoProps {
    isCollapsed: boolean;
}

const Logo = React.forwardRef<HTMLButtonElement, LogoProps>(({ isCollapsed }, ref) => {
  const router = useRouter();
  return isCollapsed ? (
    <button
      ref={ref}
      onClick={() => router.push('/')}
      className="flex items-center justify-start mb-2 cursor-pointer bg-transparent border-none p-0 hover:opacity-80 transition-opacity"
    >
      <Image src="/logo-collapsed.png" alt="Logo" width={40} height={32} />
    </button>
  ) : (
    <span
      onClick={() => router.push('/')}
      className="mb-2 flex w-full items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-center text-lg font-semibold text-primary cursor-pointer transition-colors hover:bg-primary/20"
    >
      <span>Meetily</span>
    </span>
  );
});

Logo.displayName = "Logo";

export default Logo;