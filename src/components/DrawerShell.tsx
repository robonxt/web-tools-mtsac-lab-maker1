import React from 'react';
import { X } from 'lucide-react';

interface DrawerShellProps {
  side: 'left' | 'right';
  title: string;
  subtitle?: string;
  onClose?: () => void;
  closeLabel?: string;
  children: React.ReactNode;
}

/**
 * Shared frame for all editor sidebars/drawers (Files, Insert, Document Settings)
 * ensuring uniform width, header height, touch-friendly close targets, and mobile overlay behavior.
 */
export const DrawerShell: React.FC<DrawerShellProps> = ({
  side,
  title,
  subtitle,
  onClose,
  closeLabel = 'Close panel',
  children,
}) => {
  const sideClasses =
    side === 'left'
      ? 'border-r border-slate-200 max-md:left-0'
      : 'border-l border-slate-200 max-md:right-0';

  return (
    <aside
      className={`w-[288px] shrink-0 bg-white flex flex-col h-full overflow-hidden max-md:absolute max-md:inset-y-0 max-md:z-40 max-md:shadow-2xl ${sideClasses}`}
    >
      <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-900 truncate">{title}</div>
          {subtitle && (
            <div className="text-[11px] text-slate-500 truncate">{subtitle}</div>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="min-h-[32px] min-w-[32px] p-1.5 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 rounded-md transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {children}
    </aside>
  );
};
