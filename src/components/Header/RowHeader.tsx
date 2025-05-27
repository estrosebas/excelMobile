import React, { useState, useRef } from 'react';

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
  const startY = useRef<number>(0);
  const startHeight = useRef<number>(0);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startY.current = e.clientY;
    startHeight.current = height;
    onResizeStart();
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Handle resize move
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.clientY - startY.current;
    const newHeight = Math.max(20, startHeight.current + diff); // Minimum height of 20px
    
    onResize(newHeight);
  };

  // Handle resize end
  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  return (
    <div
      className="row-header"
      style={{
        width,
        height,
        top,
      }}
    >
      <span>{row}</span>
      
      <div
        className="row-resize-handle"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}