'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  // Ensure menu doesn't flow off screen
  const safeX = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 200 : x);
  const safeY = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - (items.length * 40) : y);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{ top: safeY, left: safeX }}
        className="fixed z-50 w-48 bg-popover border border-popover-border shadow-xl rounded-xl py-1 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, idx) => (
          <button
            key={idx}
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors hover:bg-muted ${
              item.destructive ? 'text-red-500 hover:text-red-400' : 'text-foreground'
            }`}
          >
            {item.icon && <span className="opacity-70">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
