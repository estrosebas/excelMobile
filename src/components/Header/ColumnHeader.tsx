import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [currentWidth, setCurrentWidth] = useState(width);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const columnHeaderRef = useRef<HTMLDivElement>(null);
  
  // Constants for min/max width
  const MIN_COLUMN_WIDTH = 50;
  const MAX_COLUMN_WIDTH = 500;

  // Update currentWidth when width prop changes
  useEffect(() => {
    setCurrentWidth(width);
  }, [width]);

  // Handle resize start (mouse)
  const handleMouseResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    onResizeStart();
  }, [width, onResizeStart]);

  // Handle resize start (touch)
  const handleTouchResizeStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 1) {
      setIsResizing(true);
      startX.current = e.touches[0].clientX;
      startWidth.current = width;
      onResizeStart();
    }
  }, [width, onResizeStart]);

  // Handle resize move (mouse)
  const handleMouseResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.clientX - startX.current;
    const newWidth = Math.max(
      MIN_COLUMN_WIDTH, 
      Math.min(MAX_COLUMN_WIDTH, startWidth.current + diff)
    );
    
    setCurrentWidth(newWidth);
    onResize(newWidth);
  }, [isResizing, onResize]);

  // Handle resize move (touch)
  const handleTouchResizeMove = useCallback((e: TouchEvent) => {
    if (!isResizing || e.touches.length !== 1) return;
    
    e.preventDefault(); // Prevent scrolling while resizing
    
    const diff = e.touches[0].clientX - startX.current;
    const newWidth = Math.max(
      MIN_COLUMN_WIDTH, 
      Math.min(MAX_COLUMN_WIDTH, startWidth.current + diff)
    );
    
    setCurrentWidth(newWidth);
    onResize(newWidth);
  }, [isResizing, onResize]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Set up and clean up event listeners
  useEffect(() => {
    if (isResizing) {
      // Mouse events
      document.addEventListener('mousemove', handleMouseResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      // Touch events
      document.addEventListener('touchmove', handleTouchResizeMove, { passive: false });
      document.addEventListener('touchend', handleResizeEnd);
      document.addEventListener('touchcancel', handleResizeEnd);
    }
    
    return () => {
      // Clean up all event listeners
      document.removeEventListener('mousemove', handleMouseResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('touchmove', handleTouchResizeMove);
      document.removeEventListener('touchend', handleResizeEnd);
      document.removeEventListener('touchcancel', handleResizeEnd);
    };
  }, [isResizing, handleMouseResizeMove, handleTouchResizeMove, handleResizeEnd]);

  // Handle double-click to auto-size column (example implementation)
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset to default width (100px) or could implement auto-sizing based on content
    const autoWidth = 100;
    setCurrentWidth(autoWidth);
    onResize(autoWidth);
  };

  return (
    <div
      ref={columnHeaderRef}
      className={`column-header ${isResizing ? 'resizing' : ''}`}
      style={{
        width: currentWidth,
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
      
      {/* Resize handle with improved touch target */}
      <div
        ref={resizeHandleRef}
        className="column-resize-handle"
        onMouseDown={handleMouseResizeStart}
        onTouchStart={handleTouchResizeStart}
        onDoubleClick={handleDoubleClick}
      >
        {isResizing && (
          <div className="resize-indicator">
            <div className="resize-indicator-label">{Math.round(currentWidth)}px</div>
          </div>
        )}
      </div>
    </div>
  );
}