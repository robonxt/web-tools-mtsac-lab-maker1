import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

export interface AutoGrowTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  singleLineWrap?: boolean;
  recalcKey?: string;
  minRows?: number;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLTextAreaElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}

/**
 * Wrapping textarea that starts at 1 row (or minRows) and automatically grows/shrinks
 * to fit wrapped multi-line text without horizontal clipping or scrollbars.
 */
export const AutoGrowTextarea: React.FC<AutoGrowTextareaProps> = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className = '',
  style,
  singleLineWrap = false,
  recalcKey,
  minRows = 1,
  autoFocus = false,
  inputRef,
  onKeyDown,
  onFocus,
  onBlur,
}) => {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const lastWidthRef = useRef<number>(0);

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      localRef.current = node;
      if (!inputRef) return;
      if (typeof inputRef === 'function') {
        inputRef(node);
      } else {
        (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    },
    [inputRef]
  );

  const syncHeight = useCallback(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    lastWidthRef.current = el.clientWidth;
  }, []);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, recalcKey, syncHeight]);

  useEffect(() => {
    const el = localRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidthRef.current) {
        syncHeight();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncHeight]);

  return (
    <textarea
      ref={setRefs}
      rows={minRows}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={(e) => {
        const next = singleLineWrap
          ? e.target.value.replace(/\r?\n+/g, ' ')
          : e.target.value;
        onChange(next);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (singleLineWrap && e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={`block resize-none overflow-hidden break-words ${className}`}
    />
  );
};
