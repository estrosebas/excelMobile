import React, { useState, useRef, useEffect, useCallback } from 'react';

interface RowHeaderProps {
  row: number;
  width: number;
  height: number;
  top: number;
  onResize: (height: number) => void;
  onResizeStart: () => void;
}

export function RowHeader({
  row,
  width,
  height,
  top,
  onResize,
  onResizeStart,
}: RowHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(height);
  const startY = useRef<number>(0);
  const startHeight = useRef<number>(0);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const rowHeaderRef = useRef<HTMLDivElement>(null);
  
  // Constants for min/max height
  const MIN_ROW_HEIGHT = 20;
  const MAX_ROW_HEIGHT = 200;

  // Update currentHeight when height prop changes
  useEffect(() => {
    setCurrentHeight(height);
  }, [height]);

  // Handle resize start (mouse)
  const handleMouseResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startY.current = e.clientY;
    startHeight.current = height;
    onResizeStart();
  }, [height, onResizeStart]);

  // Handle resize start (touch)
  const handleTouchResizeStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 1) {
      setIsResizing(true);
      startY.current = e.touches[0].clientY;
      startHeight.current = height;
      onResizeStart();
    }
  }, [height, onResizeStart]);

  // Handle resize move (mouse)
  const handleMouseResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.clientY - startY.current;
    const newHeight = Math.max(
      MIN_ROW_HEIGHT, 
      Math.min(MAX_ROW_HEIGHT, startHeight.current + diff)
    );
    
    setCurrentHeight(newHeight);
    onResize(newHeight);
  }, [isResizing, onResize]);

  // Handle resize move (touch)
  const handleTouchResizeMove = useCallback((e: TouchEvent) => {
    if (!isResizing || e.touches.length !== 1) return;
    
    e.preventDefault(); // Prevent scrolling while resizing
    
    const diff = e.touches[0].clientY - startY.current;
    const newHeight = Math.max(
      MIN_ROW_HEIGHT, 
      Math.min(MAX_ROW_HEIGHT, startHeight.current + diff)
    );
    
    setCurrentHeight(newHeight);
    onResize(newHeight);
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

  // Handle double-click to auto-size row (example implementation)
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset to default height (24px) or could implement auto-sizing based on content
    const autoHeight = 24;
    setCurrentHeight(autoHeight);
    onResize(autoHeight);
  };

  return (
    <div
      ref={rowHeaderRef}
      className={`row-header ${isResizing ? 'resizing' : ''}`}
      style={{
        width,
        height: currentHeight,
        top,
      }}
    >
      <span>{row}</span>
      
      {/* Resize handle with improved touch target */}
      <div
        ref={resizeHandleRef}
        className="row-resize-handle"
        onMouseDown={handleMouseResizeStart}
        onTouchStart={handleTouchResizeStart}
        onDoubleClick={handleDoubleClick}
      >
        {isResizing && (
          <div className="resize-indicator">
            <div className="resize-indicator-label">{Math.round(currentHeight)}px</div>
          </div>
        )}
      </div>
    </div>
  );
}