import type { CellPosition, CellRange, GridData, SheetDimensions } from '../types';
import { generateCellId } from './cellUtils';

// Get visible cell range based on scroll position and viewport size
export const getVisibleCellRange = (
  scrollLeft: number,
  scrollTop: number,
  viewportWidth: number,
  viewportHeight: number,
  columnWidths: { [key: number]: number },
  rowHeights: { [key: number]: number },
  defaultCellWidth: number,
  defaultCellHeight: number,
  headerHeight: number,
  headerWidth: number
): CellRange => {
  // Calculate the starting column
  let startCol = 1;
  let accumulatedWidth = headerWidth;
  while (accumulatedWidth < scrollLeft && startCol < 9999) {
    const colWidth = columnWidths[startCol] || defaultCellWidth;
    accumulatedWidth += colWidth;
    startCol++;
  }
  startCol = Math.max(1, startCol - 1);

  // Calculate the starting row
  let startRow = 1;
  let accumulatedHeight = headerHeight;
  while (accumulatedHeight < scrollTop && startRow < 9999) {
    const rowHeight = rowHeights[startRow] || defaultCellHeight;
    accumulatedHeight += rowHeight;
    startRow++;
  }
  startRow = Math.max(1, startRow - 1);

  // Calculate the ending column
  let endCol = startCol;
  accumulatedWidth = headerWidth;
  for (let col = 1; col <= startCol; col++) {
    accumulatedWidth += columnWidths[col] || defaultCellWidth;
  }
  while (accumulatedWidth < scrollLeft + viewportWidth && endCol < 1000) {
    endCol++;
    accumulatedWidth += columnWidths[endCol] || defaultCellWidth;
  }
  endCol = Math.min(1000, endCol + 1); // Add a buffer

  // Calculate the ending row
  let endRow = startRow;
  accumulatedHeight = headerHeight;
  for (let row = 1; row <= startRow; row++) {
    accumulatedHeight += rowHeights[row] || defaultCellHeight;
  }
  while (accumulatedHeight < scrollTop + viewportHeight && endRow < 1000) {
    endRow++;
    accumulatedHeight += rowHeights[endRow] || defaultCellHeight;
  }
  endRow = Math.min(1000, endRow + 1); // Add a buffer

  return {
    start: { row: startRow, col: startCol },
    end: { row: endRow, col: endCol },
  };
};

// Get column position and width
export const getColumnPosition = (
  columnIndex: number,
  columnWidths: { [key: number]: number },
  defaultCellWidth: number,
  headerWidth: number
): { left: number; width: number } => {
  let left = headerWidth;
  for (let i = 1; i < columnIndex; i++) {
    left += columnWidths[i] || defaultCellWidth;
  }
  return {
    left,
    width: columnWidths[columnIndex] || defaultCellWidth,
  };
};

// Get row position and height
export const getRowPosition = (
  rowIndex: number,
  rowHeights: { [key: number]: number },
  defaultCellHeight: number,
  headerHeight: number
): { top: number; height: number } => {
  let top = headerHeight;
  for (let i = 1; i < rowIndex; i++) {
    top += rowHeights[i] || defaultCellHeight;
  }
  return {
    top,
    height: rowHeights[rowIndex] || defaultCellHeight,
  };
};

// Get total grid width
export const getGridWidth = (
  dimensions: SheetDimensions,
  columnWidths: { [key: number]: number },
  defaultCellWidth: number,
  headerWidth: number
): number => {
  let width = headerWidth;
  for (let i = 1; i <= dimensions.cols; i++) {
    width += columnWidths[i] || defaultCellWidth;
  }
  return width;
};

// Get total grid height
export const getGridHeight = (
  dimensions: SheetDimensions,
  rowHeights: { [key: number]: number },
  defaultCellHeight: number,
  headerHeight: number
): number => {
  let height = headerHeight;
  for (let i = 1; i <= dimensions.rows; i++) {
    height += rowHeights[i] || defaultCellHeight;
  }
  return height;
};

// Create a range between two cell positions
export const createCellRange = (
  start: CellPosition,
  end: CellPosition
): CellRange => {
  return {
    start: {
      row: Math.min(start.row, end.row),
      col: Math.min(start.col, end.col),
    },
    end: {
      row: Math.max(start.row, end.row),
      col: Math.max(start.col, end.col),
    },
  };
};

// Get all cell positions in a range
export const getCellsInRange = (range: CellRange): CellPosition[] => {
  const cells: CellPosition[] = [];
  for (let row = range.start.row; row <= range.end.row; row++) {
    for (let col = range.start.col; col <= range.end.col; col++) {
      cells.push({ row, col });
    }
  }
  return cells;
};

// Copy cells from one range to another
export const copyCells = (
  gridData: GridData,
  sourceRange: CellRange,
  targetStart: CellPosition
): GridData => {
  const updatedGridData = { ...gridData };
  const rowOffset = targetStart.row - sourceRange.start.row;
  const colOffset = targetStart.col - sourceRange.start.col;
  
  for (let row = sourceRange.start.row; row <= sourceRange.end.row; row++) {
    for (let col = sourceRange.start.col; col <= sourceRange.end.col; col++) {
      const sourceCellId = generateCellId(row, col);
      const targetRow = row + rowOffset;
      const targetCol = col + colOffset;
      const targetCellId = generateCellId(targetRow, targetCol);
      
      if (gridData[sourceCellId]) {
        updatedGridData[targetCellId] = {
          ...gridData[sourceCellId],
          id: targetCellId,
        };
      }
    }
  }
  
  return updatedGridData;
};

// Get cell at a specific position in the grid
export const getCellAtPosition = (
  clientX: number,
  clientY: number,
  gridRef: React.RefObject<HTMLDivElement>,
  columnWidths: { [key: number]: number },
  rowHeights: { [key: number]: number },
  defaultCellWidth: number,
  defaultCellHeight: number,
  headerHeight: number,
  headerWidth: number
): CellPosition | null => {
  if (!gridRef.current) return null;
  
  const rect = gridRef.current.getBoundingClientRect();
  const x = clientX - rect.left + gridRef.current.scrollLeft;
  const y = clientY - rect.top + gridRef.current.scrollTop;
  
  // Ignore clicks on headers
  if (x < headerWidth || y < headerHeight) return null;
  
  // Find the column
  let col = 1;
  let accumulatedWidth = headerWidth;
  while (accumulatedWidth < x && col <= 1000) {
    accumulatedWidth += columnWidths[col] || defaultCellWidth;
    if (accumulatedWidth > x) break;
    col++;
  }
  
  // Find the row
  let row = 1;
  let accumulatedHeight = headerHeight;
  while (accumulatedHeight < y && row <= 9999) {
    accumulatedHeight += rowHeights[row] || defaultCellHeight;
    if (accumulatedHeight > y) break;
    row++;
  }
  
  return { row, col };
};