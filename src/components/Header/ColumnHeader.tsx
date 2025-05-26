import React, { useState, useRef } from 'react';
import { ArrowUp, ArrowDown, Filter } from 'lucide-react';

interface ColumnHeaderProps {
  column: number;
  letter: string;
  width: number;
  height: number;
  left: number;
  onResize: (width: number) => void;
  onResizeStart: () => void;
  onSort: (e: React.MouseEvent) => void;
  onFilter: (e: React.MouseEvent) => void;
  isFiltered: boolean;
  isSorted: 'asc' | 'desc' | null;
}

export function ColumnHeader({
  column,
  letter,
  width,
  height,
  left,
  onResize,
  onResizeStart,
  onSort,
  onFilter,
  isFiltered,
  isSorted,
}: ColumnHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    onResizeStart();
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Handle resize move
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff); // Minimum width of 50px
    
    onResize(newWidth);
  };

  // Handle resize end
  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  return (
    <div
      className="column-header"
      style={{
        width,
        height,
        left,
      }}
      onClick={onSort}
    >
      <span>{letter}</span>
      
      {isSorted && (
        <span className="sort-indicator">
          {isSorted === 'asc' ? (
            <ArrowUp size={12} />
          ) : (
            <ArrowDown size={12} />
          )}
        </span>
      )}
      
      <button
        className="filter-button"
        onClick={onFilter}
        style={{
          position: 'absolute',
          right: '16px',
          opacity: isFiltered ? 1 : 0.5,
        }}
      >
        <Filter size={12} />
      </button>
      
      <div
        className="column-resize-handle"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}