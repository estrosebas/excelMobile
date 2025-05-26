export type CellValue = string | number | boolean | null;

export type CellPosition = {
  row: number;
  col: number;
};

export type CellId = string; // Format: "R{row}C{col}" e.g. "R1C1"

export type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
  numberFormat?: string;
};

export type Cell = {
  id: CellId;
  value: CellValue;
  formula?: string;
  formattedValue?: string;
  style?: CellStyle;
};

export type GridData = {
  [key: CellId]: Cell;
};

export type CellRange = {
  start: CellPosition;
  end: CellPosition;
};

export type UndoRedoAction = {
  type: 'cell-update' | 'multi-cell-update' | 'style-update' | 'column-resize' | 'row-resize';
  data: any;
  undo: () => void;
  redo: () => void;
};

export type UndoRedoState = {
  past: UndoRedoAction[];
  future: UndoRedoAction[];
};

export type ToolbarOptions = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: 'left' | 'center' | 'right';
};

export type SheetDimensions = {
  rows: number;
  cols: number;
};

export type SpreadsheetState = {
  data: GridData;
  activeCell: CellPosition | null;
  selectionRange: CellRange | null;
  dimensions: SheetDimensions;
  columnWidths: { [key: number]: number };
  rowHeights: { [key: number]: number };
  undoRedo: UndoRedoState;
  toolbarOptions: ToolbarOptions;
  isEditing: boolean;
  searchTerm: string;
  filterOptions: { [key: number]: FilterOptions };
  isSorted: { col: number; direction: 'asc' | 'desc' } | null;
};

export type FilterOptions = {
  enabled: boolean;
  condition: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | null;
  secondValue?: string | number | null; // For 'between' condition
};