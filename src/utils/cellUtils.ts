import type { Cell, CellId, CellPosition, CellStyle, CellValue, GridData } from '../types';

// Generate a cell ID from row and column indices
export const generateCellId = (row: number, col: number): CellId => {
  return `R${row}C${col}`;
};

// Parse a cell ID to get row and column indices
export const parseCellId = (cellId: CellId): CellPosition => {
  const match = cellId.match(/R(\d+)C(\d+)/);
  if (!match) {
    throw new Error(`Invalid cell ID: ${cellId}`);
  }
  return {
    row: parseInt(match[1], 10),
    col: parseInt(match[2], 10),
  };
};

// Convert column index to Excel-like column letter (A, B, C, ..., Z, AA, AB, ...)
export const columnIndexToLetter = (col: number): string => {
  let dividend = col;
  let columnName = '';
  let modulo;

  while (dividend > 0) {
    modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
};

// Convert Excel-like column letter to column index
export const columnLetterToIndex = (letter: string): number => {
  let column = 0;
  const length = letter.length;
  
  for (let i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  
  return column;
};

// Create an empty cell
export const createEmptyCell = (row: number, col: number): Cell => {
  const id = generateCellId(row, col);
  return {
    id,
    value: null,
  };
};

// Get cell from grid data or create a new one if it doesn't exist
export const getOrCreateCell = (gridData: GridData, row: number, col: number): Cell => {
  const cellId = generateCellId(row, col);
  return gridData[cellId] || createEmptyCell(row, col);
};

// Format cell value based on its type and style
export const formatCellValue = (cell: Cell): string => {
  if (cell.value === null || cell.value === undefined) {
    return '';
  }

  if (typeof cell.value === 'number') {
    // Apply number formatting based on cell.style.numberFormat
    if (cell.style?.numberFormat === 'currency') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cell.value);
    } else if (cell.style?.numberFormat === 'percentage') {
      return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(cell.value / 100);
    } else {
      return cell.value.toString();
    }
  }

  return cell.value.toString();
};

// Apply style to a cell
export const applyCellStyle = (cell: Cell, style: Partial<CellStyle>): Cell => {
  return {
    ...cell,
    style: {
      ...cell.style,
      ...style,
    },
  };
};

// Determines if a cell position is within a range
export const isCellInRange = (
  cellPos: CellPosition,
  range: { start: CellPosition; end: CellPosition }
): boolean => {
  return (
    cellPos.row >= range.start.row &&
    cellPos.row <= range.end.row &&
    cellPos.col >= range.start.col &&
    cellPos.col <= range.end.col
  );
};

// Convert a cell value to its appropriate type
export const parseCellValue = (value: string): CellValue => {
  if (value === '') return null;
  
  // Check if it's a number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value);
  }
  
  // Check if it's a boolean
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  
  // Otherwise, it's a string
  return value;
};