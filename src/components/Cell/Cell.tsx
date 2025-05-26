import React, { useState, useRef, useEffect } from 'react';
import type { Cell as CellType } from '../../types';
import { formatCellValue } from '../../utils/cellUtils';

interface CellProps {
  cell: CellType | undefined;
  row: number;
  col: number;
  width: number;
  height: number;
  left: number;
  top: number;
  isActive: boolean;
  isSelected: boolean;
  isEditing: boolean;
  isHighlighted: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onValueChange: (value: string) => void;
}

export function Cell({
  cell,
  row,
  col,
  width,
  height,
  left,
  top,
  isActive,
  isSelected,
  isEditing,
  isHighlighted,
  onMouseDown,
  onDoubleClick,
  onValueChange,
}: CellProps) {
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edit value when cell changes or editing begins
  useEffect(() => {
    if (isEditing) {
      if (cell) {
        // If it's a formula, show the formula
        if (cell.formula) {
          setEditValue(cell.formula);
        } else {
          setEditValue(cell.value !== null ? String(cell.value) : '');
        }
      } else {
        setEditValue('');
      }
      
      // Focus input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    }
  }, [isEditing, cell]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  // Handle key down in editor
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
      onValueChange(editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.blur();
      // Reset to original value
      setEditValue(cell?.value !== null ? String(cell?.value) : '');
    }
  };

  // Handle blur
  const handleBlur = () => {
    onValueChange(editValue);
  };

  // Get cell classes
  const getCellClasses = () => {
    let classes = 'cell';
    if (isActive) classes += ' active';
    if (isSelected) classes += ' selected';
    if (isEditing) classes += ' editing';
    if (isHighlighted) classes += ' highlighted';
    return classes;
  };

  // Get content classes
  const getContentClasses = () => {
    let classes = 'cell-content';
    
    if (cell?.style) {
      if (cell.style.bold) classes += ' bold';
      if (cell.style.italic) classes += ' italic';
      if (cell.style.underline) classes += ' underline';
      if (cell.style.textAlign) classes += ` text-${cell.style.textAlign}`;
    }
    
    return classes;
  };

  // Get inline styles
  const getInlineStyles = () => {
    const styles: React.CSSProperties = {};
    
    if (cell?.style) {
      if (cell.style.backgroundColor) {
        styles.backgroundColor = cell.style.backgroundColor;
      }
      if (cell.style.textColor) {
        styles.color = cell.style.textColor;
      }
    }
    
    return styles;
  };

  return (
    <div
      className={getCellClasses()}
      style={{
        width,
        height,
        left,
        top,
        ...getInlineStyles(),
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="cell-editor"
          value={editValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      ) : (
        <div className={getContentClasses()}>
          {cell ? formatCellValue(cell) : ''}
        </div>
      )}
    </div>
  );
}