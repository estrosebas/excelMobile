import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Cell } from '../Cell/Cell';
import { ColumnHeader } from '../Header/ColumnHeader';
import { RowHeader } from '../Header/RowHeader';
import type { CellPosition, CellRange, GridData, FilterOptions } from '../../types';
import { columnIndexToLetter, generateCellId } from '../../utils/cellUtils';

interface GridProps {
  data: GridData;
  visibleRange: CellRange;
  activeCell: CellPosition | null;
  selectionRange: CellRange | null;
  isEditing: boolean;
  gridSize: {
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
  };
  columnWidths: { [key: number]: number };
  rowHeights: { [key: number]: number };
  defaultCellWidth: number;
  defaultCellHeight: number;
  headerWidth: number;
  headerHeight: number;
  onCellClick: (position: CellPosition) => void;
  onCellDoubleClick: () => void;
  onCellValueChange: (row: number, col: number, value: string) => void;
  onSelectionChange: (start: CellPosition, end: CellPosition) => void;
  onColumnResize: (col: number, width: number) => void;
  onRowResize: (row: number, height: number) => void;
  onResizeStart: () => void;
  searchTerm: string;
  filterOptions: { [key: number]: FilterOptions };
  onFilterChange: (col: number, options: FilterOptions) => void;
  isSorted: { col: number; direction: 'asc' | 'desc' } | null;
  onSort: (col: number, direction: 'asc' | 'desc') => void;
}

export function Grid({
  data,
  visibleRange,
  activeCell,
  selectionRange,
  isEditing,
  gridSize,
  columnWidths,
  rowHeights,
  defaultCellWidth,
  defaultCellHeight,
  headerWidth,
  headerHeight,
  onCellClick,
  onCellDoubleClick,
  onCellValueChange,
  onSelectionChange,
  onColumnResize,
  onRowResize,
  onResizeStart,
  searchTerm,
  filterOptions,
  onFilterChange,
  isSorted,
  onSort
}: GridProps) {
  const [selectionStart, setSelectionStart] = useState<CellPosition | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    cell: CellPosition;
  } | null>(null);
  const [filterPopup, setFilterPopup] = useState<{
    col: number;
    x: number;
    y: number;
  } | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Handle mouse down on a cell
  const handleCellMouseDown = useCallback((position: CellPosition, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Right-click for context menu
    if (e.button === 2) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        cell: position,
      });
      return;
    }
    
    onCellClick(position);
    setSelectionStart(position);
    setIsSelecting(true);
  }, [onCellClick]);

  // Handle mouse move while selecting
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart || !gridRef.current) return;
    
    // Calculate the cell under the mouse
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + gridRef.current.scrollLeft;
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    
    // Find the column
    let col = 1;
    let accumulatedWidth = headerWidth;
    while (accumulatedWidth < x && col <= visibleRange.end.col) {
      accumulatedWidth += columnWidths[col] || defaultCellWidth;
      if (accumulatedWidth > x) break;
      col++;
    }
    
    // Find the row
    let row = 1;
    let accumulatedHeight = headerHeight;
    while (accumulatedHeight < y && row <= visibleRange.end.row) {
      accumulatedHeight += rowHeights[row] || defaultCellHeight;
      if (accumulatedHeight > y) break;
      row++;
    }
    
    // Update selection
    if (row >= 1 && col >= 1) {
      onSelectionChange(selectionStart, { row, col });
    }
  }, [isSelecting, selectionStart, onSelectionChange, gridRef, headerWidth, headerHeight, columnWidths, rowHeights, defaultCellWidth, defaultCellHeight, visibleRange.end.col, visibleRange.end.row]);

  // Handle mouse up to finish selection
  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // Handle cell double click
  const handleCellDoubleClick = useCallback(() => {
    onCellDoubleClick();
  }, [onCellDoubleClick]);

  // Handle cell value change
  const handleCellValueChange = useCallback((row: number, col: number, value: string) => {
    onCellValueChange(row, col, value);
  }, [onCellValueChange]);

  // Check if a cell is selected
  const isCellSelected = useCallback((row: number, col: number): boolean => {
    if (!selectionRange) return false;
    
    return (
      row >= selectionRange.start.row &&
      row <= selectionRange.end.row &&
      col >= selectionRange.start.col &&
      col <= selectionRange.end.col
    );
  }, [selectionRange]);

  // Check if a cell is active
  const isCellActive = useCallback((row: number, col: number): boolean => {
    return !!(activeCell && activeCell.row === row && activeCell.col === col);
  }, [activeCell]);

  // Calculate cell position based on row and column
  const getCellPosition = useCallback((row: number, col: number) => {
    let left = headerWidth;
    for (let i = 1; i < col; i++) {
      left += columnWidths[i] || defaultCellWidth;
    }
    
    let top = headerHeight;
    for (let i = 1; i < row; i++) {
      top += rowHeights[i] || defaultCellHeight;
    }
    
    return {
      left,
      top,
      width: columnWidths[col] || defaultCellWidth,
      height: rowHeights[row] || defaultCellHeight,
    };
  }, [columnWidths, rowHeights, defaultCellWidth, defaultCellHeight, headerWidth, headerHeight]);

  // Handle column header click for sorting
  const handleColumnHeaderClick = useCallback((col: number, e: React.MouseEvent) => {
    // Toggle sort direction
    if (isSorted && isSorted.col === col) {
      onSort(col, isSorted.direction === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(col, 'asc');
    }
    
    e.stopPropagation();
  }, [isSorted, onSort]);

  // Handle filter button click
  const handleFilterClick = useCallback((col: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterPopup({
      col,
      x: buttonRect.left,
      y: buttonRect.bottom,
    });
  }, []);

  // Apply filter
  const handleApplyFilter = useCallback((col: number, condition: string, value: string) => {
    onFilterChange(col, {
      enabled: true,
      condition: condition as any,
      value: value,
    });
    setFilterPopup(null);
  }, [onFilterChange]);

  // Clear filter for a column
  const handleClearFilter = useCallback((col: number) => {
    onFilterChange(col, {
      enabled: false,
      condition: 'equals',
      value: null,
    });
    setFilterPopup(null);
  }, [onFilterChange]);

  // Check if cell matches search term
  const cellMatchesSearch = useCallback((cellId: string): boolean => {
    if (!searchTerm) return false;
    
    const cell = data[cellId];
    if (!cell || cell.value === null) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const cellValue = String(cell.value).toLowerCase();
    
    return cellValue.includes(searchLower);
  }, [searchTerm, data]);

  // Check if cell passes filters
  const cellPassesFilters = useCallback((row: number, col: number): boolean => {
    // If no filters are applied, all cells pass
    if (Object.keys(filterOptions).length === 0) return true;
    
    // Check if this column has a filter
    for (const filterCol in filterOptions) {
      const filter = filterOptions[filterCol];
      if (!filter.enabled) continue;
      
      // Only check the filter for the current column
      if (parseInt(filterCol) !== col) continue;
      
      const cellId = generateCellId(row, col);
      const cell = data[cellId];
      const cellValue = cell?.value;
      
      if (cellValue === null || cellValue === undefined) {
        return false;
      }
      
      const filterValue = filter.value;
      
      switch (filter.condition) {
        case 'equals':
          return String(cellValue) === String(filterValue);
        case 'contains':
          return String(cellValue).includes(String(filterValue));
        case 'startsWith':
          return String(cellValue).startsWith(String(filterValue));
        case 'endsWith':
          return String(cellValue).endsWith(String(filterValue));
        case 'greaterThan':
          return Number(cellValue) > Number(filterValue);
        case 'lessThan':
          return Number(cellValue) < Number(filterValue);
        case 'between':
          return (
            Number(cellValue) >= Number(filterValue) &&
            Number(cellValue) <= Number(filter.secondValue)
          );
        default:
          return true;
      }
    }
    
    return true;
  }, [filterOptions, data]);

  // Render column headers
  const renderColumnHeaders = () => {
    const headers = [];
    
    // Corner header
    headers.push(
      <div
        key="corner"
        className="corner-header"
        style={{
          width: headerWidth,
          height: headerHeight,
        }}
      />
    );
    
    // Column headers
    for (let col = visibleRange.start.col; col <= visibleRange.end.col; col++) {
      const { left, width } = getCellPosition(1, col);
      
      headers.push(
        <ColumnHeader
          key={`col-${col}`}
          column={col}
          letter={columnIndexToLetter(col)}
          width={width}
          height={headerHeight}
          left={left}
          onResize={(newWidth) => onColumnResize(col, newWidth)}
          onResizeStart={onResizeStart}
          onSort={(e) => handleColumnHeaderClick(col, e)}
          onFilter={(e) => handleFilterClick(col, e)}
          isFiltered={filterOptions[col]?.enabled}
          isSorted={isSorted?.col === col ? isSorted.direction : null}
        />
      );
    }
    
    return headers;
  };

  // Render row headers
  const renderRowHeaders = () => {
    const headers = [];
    
    for (let row = visibleRange.start.row; row <= visibleRange.end.row; row++) {
      const { top, height } = getCellPosition(row, 1);
      
      headers.push(
        <RowHeader
          key={`row-${row}`}
          row={row}
          width={headerWidth}
          height={height}
          top={top}
          onResize={(newHeight) => onRowResize(row, newHeight)}
          onResizeStart={onResizeStart}
        />
      );
    }
    
    return headers;
  };

  // Render visible cells
  const renderCells = () => {
    const cells = [];
    
    for (let row = visibleRange.start.row; row <= visibleRange.end.row; row++) {
      for (let col = visibleRange.start.col; col <= visibleRange.end.col; col++) {
        // Skip cells that don't pass filters
        if (!cellPassesFilters(row, col)) continue;
        
        const cellId = generateCellId(row, col);
        const cellData = data[cellId];
        const { left, top, width, height } = getCellPosition(row, col);
        const isActive = isCellActive(row, col);
        const isSelected = isCellSelected(row, col);
        const isEditable = isActive && isEditing;
        const isHighlighted = cellMatchesSearch(cellId);
        
        cells.push(
          <Cell
            key={cellId}
            cell={cellData}
            row={row}
            col={col}
            width={width}
            height={height}
            left={left}
            top={top}
            isActive={isActive}
            isSelected={isSelected}
            isEditing={isEditable}
            isHighlighted={isHighlighted}
            onMouseDown={(e) => handleCellMouseDown({ row, col }, e)}
            onDoubleClick={handleCellDoubleClick}
            onValueChange={(value) => handleCellValueChange(row, col, value)}
          />
        );
      }
    }
    
    return cells;
  };

  return (
    <div
      ref={gridRef}
      className="spreadsheet-grid"
      style={{ width: gridSize.width, height: gridSize.height }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="column-headers">
        {renderColumnHeaders()}
      </div>
      
      <div className="row-headers">
        {renderRowHeaders()}
      </div>
      
      {renderCells()}
      
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item">Cut</div>
          <div className="context-menu-item">Copy</div>
          <div className="context-menu-item">Paste</div>
          <div className="context-menu-separator"></div>
          <div className="context-menu-item">Insert Row</div>
          <div className="context-menu-item">Insert Column</div>
          <div className="context-menu-item">Delete Row</div>
          <div className="context-menu-item">Delete Column</div>
          <div className="context-menu-separator"></div>
          <div className="context-menu-item">Clear Contents</div>
        </div>
      )}
      
      {filterPopup && (
        <div
          className="filter-popup"
          style={{ top: filterPopup.y, left: filterPopup.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="filter-option">
            <select className="filter-select">
              <option value="equals">Equals</option>
              <option value="contains">Contains</option>
              <option value="startsWith">Starts with</option>
              <option value="endsWith">Ends with</option>
              <option value="greaterThan">Greater than</option>
              <option value="lessThan">Less than</option>
              <option value="between">Between</option>
            </select>
          </div>
          
          <div className="filter-option">
            <input type="text" className="filter-input" placeholder="Value" />
          </div>
          
          <div className="filter-buttons">
            <button
              className="filter-button cancel"
              onClick={() => handleClearFilter(filterPopup.col)}
            >
              Clear
            </button>
            <button
              className="filter-button"
              onClick={() => {
                // Get values from the inputs
                const select = document.querySelector('.filter-select') as HTMLSelectElement;
                const input = document.querySelector('.filter-input') as HTMLInputElement;
                
                if (select && input) {
                  handleApplyFilter(filterPopup.col, select.value, input.value);
                }
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}