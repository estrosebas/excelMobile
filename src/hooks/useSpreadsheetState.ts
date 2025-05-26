import { useState, useCallback, useRef } from 'react';
import type {
  SpreadsheetState,
  GridData,
  CellPosition,
  CellRange,
  Cell,
  CellId,
  UndoRedoAction,
  UndoRedoState,
  SheetDimensions,
  CellStyle
} from '../types';
import { generateCellId, parseCellValue } from '../utils/cellUtils';
import { FormulaEngine } from '../utils/formulaEngine';
import { createCellRange, getCellsInRange, copyCells } from '../utils/gridUtils';

const DEFAULT_DIMENSIONS: SheetDimensions = {
  rows: 10000,
  cols: 26
};

const initialToolbarOptions = {
  bold: false,
  italic: false,
  underline: false,
  textAlign: 'left' as ('left' | 'center' | 'right')
};

const initialUndoRedoState: UndoRedoState = {
  past: [],
  future: []
};

export function useSpreadsheetState() {
  const [state, setState] = useState<SpreadsheetState>({
    data: {},
    activeCell: null,
    selectionRange: null,
    dimensions: DEFAULT_DIMENSIONS,
    columnWidths: {},
    rowHeights: {},
    undoRedo: initialUndoRedoState,
    toolbarOptions: initialToolbarOptions,
    isEditing: false,
    searchTerm: '',
    filterOptions: {},
    isSorted: null
  });

  const formulaEngineRef = useRef<FormulaEngine>(new FormulaEngine(state.data));

  // Update a cell value
  const updateCellValue = useCallback((row: number, col: number, value: string) => {
    setState(prevState => {
      const cellId = generateCellId(row, col);
      const oldCell = prevState.data[cellId] || { id: cellId, value: null };
      
      // Determine if it's a formula
      const isFormula = value.startsWith('=');
      let newValue = isFormula ? null : parseCellValue(value);
      let formula = isFormula ? value : undefined;
      
      // If it's a formula, evaluate it
      if (isFormula) {
        try {
          formulaEngineRef.current = new FormulaEngine(prevState.data);
          newValue = formulaEngineRef.current.evaluate(value, cellId);
        } catch (error) {
          console.error('Formula error:', error);
          newValue = '#ERROR!';
        }
      }
      
      const newCell: Cell = {
        ...oldCell,
        value: newValue,
        formula
      };
      
      // Create undo/redo action
      const undoAction: UndoRedoAction = {
        type: 'cell-update',
        data: { cellId, oldCell, newCell },
        undo: () => {},
        redo: () => {}
      };
      
      // Update grid data
      const newData = {
        ...prevState.data,
        [cellId]: newCell
      };
      
      // Recalculate any cells that depend on this one if needed
      if (isFormula || oldCell.formula) {
        formulaEngineRef.current = new FormulaEngine(newData);
        const recalculatedData = formulaEngineRef.current.recalculateAll();
        Object.assign(newData, recalculatedData);
      }
      
      return {
        ...prevState,
        data: newData,
        undoRedo: {
          past: [...prevState.undoRedo.past, undoAction],
          future: []
        },
        isEditing: false
      };
    });
  }, []);

  // Apply style to selected cells
  const applyStyle = useCallback((style: Partial<CellStyle>) => {
    setState(prevState => {
      const { selectionRange, activeCell, data } = prevState;
      if (!selectionRange && !activeCell) return prevState;
      
      const cellsToUpdate: CellPosition[] = selectionRange
        ? getCellsInRange(selectionRange)
        : activeCell
          ? [activeCell]
          : [];
      
      const oldCells: { [key: CellId]: Cell } = {};
      const newData = { ...data };
      
      cellsToUpdate.forEach(({ row, col }) => {
        const cellId = generateCellId(row, col);
        const oldCell = data[cellId] || { id: cellId, value: null };
        oldCells[cellId] = oldCell;
        
        newData[cellId] = {
          ...oldCell,
          style: {
            ...oldCell.style,
            ...style
          }
        };
      });
      
      // Create undo/redo action
      const undoAction: UndoRedoAction = {
        type: 'style-update',
        data: { oldCells, style },
        undo: () => {},
        redo: () => {}
      };
      
      return {
        ...prevState,
        data: newData,
        undoRedo: {
          past: [...prevState.undoRedo.past, undoAction],
          future: []
        },
        toolbarOptions: {
          ...prevState.toolbarOptions,
          ...style
        }
      };
    });
  }, []);

  // Set active cell
  const setActiveCell = useCallback((position: CellPosition | null) => {
    setState(prevState => {
      if (!position) {
        return {
          ...prevState,
          activeCell: null,
          selectionRange: null,
          isEditing: false,
          toolbarOptions: initialToolbarOptions
        };
      }
      
      const cellId = generateCellId(position.row, position.col);
      const cell = prevState.data[cellId] || { id: cellId, value: null };
      
      // Update toolbar options based on selected cell
      const toolbarOptions = {
        bold: cell.style?.bold || false,
        italic: cell.style?.italic || false,
        underline: cell.style?.underline || false,
        textAlign: cell.style?.textAlign || 'left'
      };
      
      return {
        ...prevState,
        activeCell: position,
        selectionRange: null,
        isEditing: false,
        toolbarOptions
      };
    });
  }, []);

  // Set selection range
  const setSelectionRange = useCallback((start: CellPosition, end: CellPosition) => {
    setState(prevState => {
      const range = createCellRange(start, end);
      
      // Calculate common style attributes for the selection
      const cells = getCellsInRange(range).map(({ row, col }) => {
        const cellId = generateCellId(row, col);
        return prevState.data[cellId];
      }).filter(Boolean);
      
      // Default toolbar options
      const toolbarOptions = { ...initialToolbarOptions };
      
      // Only set style properties that are common to all cells
      if (cells.length > 0) {
        const allBold = cells.every(cell => cell.style?.bold);
        const allItalic = cells.every(cell => cell.style?.italic);
        const allUnderline = cells.every(cell => cell.style?.underline);
        const allSameAlign = cells.every(cell => 
          cell.style?.textAlign === cells[0].style?.textAlign
        );
        
        toolbarOptions.bold = allBold;
        toolbarOptions.italic = allItalic;
        toolbarOptions.underline = allUnderline;
        
        if (allSameAlign && cells[0].style?.textAlign) {
          toolbarOptions.textAlign = cells[0].style.textAlign;
        }
      }
      
      return {
        ...prevState,
        activeCell: start,
        selectionRange: range,
        isEditing: false,
        toolbarOptions
      };
    });
  }, []);

  // Set editing state
  const setIsEditing = useCallback((isEditing: boolean) => {
    setState(prevState => ({
      ...prevState,
      isEditing
    }));
  }, []);

  // Handle copy operation
  const handleCopy = useCallback(() => {
    const { selectionRange, activeCell, data } = state;
    if (!selectionRange && !activeCell) return '';
    
    const range = selectionRange || (activeCell ? { start: activeCell, end: activeCell } : null);
    if (!range) return '';
    
    // Format data as tab-separated values
    let copyText = '';
    for (let row = range.start.row; row <= range.end.row; row++) {
      const rowData = [];
      for (let col = range.start.col; col <= range.end.col; col++) {
        const cellId = generateCellId(row, col);
        const cell = data[cellId];
        rowData.push(cell ? cell.value || '' : '');
      }
      copyText += rowData.join('\t') + '\n';
    }
    
    navigator.clipboard.writeText(copyText);
    return copyText;
  }, [state]);

  // Handle paste operation
  const handlePaste = useCallback(async (targetCell: CellPosition) => {
    try {
      const text = await navigator.clipboard.readText();
      
      // Parse the text as tab-separated values
      const rows = text.trim().split('\n');
      const pastedData: string[][] = rows.map(row => row.split('\t'));
      
      // Apply data to grid
      setState(prevState => {
        const newData = { ...prevState.data };
        
        pastedData.forEach((rowData, rowIndex) => {
          rowData.forEach((value, colIndex) => {
            const row = targetCell.row + rowIndex;
            const col = targetCell.col + colIndex;
            const cellId = generateCellId(row, col);
            
            // Check if it's a formula
            const isFormula = value.startsWith('=');
            let cellValue = isFormula ? null : parseCellValue(value);
            let formula = isFormula ? value : undefined;
            
            // If it's a formula, evaluate it
            if (isFormula) {
              try {
                formulaEngineRef.current = new FormulaEngine(newData);
                cellValue = formulaEngineRef.current.evaluate(value, cellId);
              } catch (error) {
                console.error('Formula error:', error);
                cellValue = '#ERROR!';
              }
            }
            
            newData[cellId] = {
              ...newData[cellId],
              id: cellId,
              value: cellValue,
              formula
            };
          });
        });
        
        // Calculate new dimensions if needed
        const maxRow = Math.max(
          prevState.dimensions.rows,
          targetCell.row + pastedData.length - 1
        );
        const maxCol = Math.max(
          prevState.dimensions.cols,
          targetCell.col + Math.max(...pastedData.map(row => row.length)) - 1
        );
        
        // Recalculate formulas
        formulaEngineRef.current = new FormulaEngine(newData);
        const recalculatedData = formulaEngineRef.current.recalculateAll();
        Object.assign(newData, recalculatedData);
        
        return {
          ...prevState,
          data: newData,
          dimensions: {
            rows: maxRow,
            cols: maxCol
          },
          // Set new selection range based on pasted data
          selectionRange: {
            start: targetCell,
            end: {
              row: targetCell.row + pastedData.length - 1,
              col: targetCell.col + (pastedData[0]?.length || 1) - 1
            }
          }
        };
      });
    } catch (error) {
      console.error('Paste error:', error);
    }
  }, []);

  // Resize column
  const resizeColumn = useCallback((col: number, width: number) => {
    setState(prevState => {
      const oldWidth = prevState.columnWidths[col] || 100;
      
      // Create undo/redo action
      const undoAction: UndoRedoAction = {
        type: 'column-resize',
        data: { col, oldWidth, newWidth: width },
        undo: () => {},
        redo: () => {}
      };
      
      return {
        ...prevState,
        columnWidths: {
          ...prevState.columnWidths,
          [col]: width
        },
        undoRedo: {
          past: [...prevState.undoRedo.past, undoAction],
          future: []
        }
      };
    });
  }, []);

  // Resize row
  const resizeRow = useCallback((row: number, height: number) => {
    setState(prevState => {
      const oldHeight = prevState.rowHeights[row] || 24;
      
      // Create undo/redo action
      const undoAction: UndoRedoAction = {
        type: 'row-resize',
        data: { row, oldHeight, newHeight: height },
        undo: () => {},
        redo: () => {}
      };
      
      return {
        ...prevState,
        rowHeights: {
          ...prevState.rowHeights,
          [row]: height
        },
        undoRedo: {
          past: [...prevState.undoRedo.past, undoAction],
          future: []
        }
      };
    });
  }, []);

  // Undo operation
  const undo = useCallback(() => {
    setState(prevState => {
      const { past, future } = prevState.undoRedo;
      if (past.length === 0) return prevState;
      
      const lastAction = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      
      // Apply undo logic based on action type
      let newState = { ...prevState };
      
      if (lastAction.type === 'cell-update') {
        const { cellId, oldCell } = lastAction.data;
        newState.data = {
          ...newState.data,
          [cellId]: oldCell
        };
      } else if (lastAction.type === 'style-update') {
        const { oldCells } = lastAction.data;
        Object.keys(oldCells).forEach(cellId => {
          newState.data[cellId] = oldCells[cellId];
        });
      } else if (lastAction.type === 'column-resize') {
        const { col, oldWidth } = lastAction.data;
        newState.columnWidths = {
          ...newState.columnWidths,
          [col]: oldWidth
        };
      } else if (lastAction.type === 'row-resize') {
        const { row, oldHeight } = lastAction.data;
        newState.rowHeights = {
          ...newState.rowHeights,
          [row]: oldHeight
        };
      }
      
      // Recalculate formulas if needed
      if (lastAction.type === 'cell-update') {
        formulaEngineRef.current = new FormulaEngine(newState.data);
        const recalculatedData = formulaEngineRef.current.recalculateAll();
        Object.assign(newState.data, recalculatedData);
      }
      
      return {
        ...newState,
        undoRedo: {
          past: newPast,
          future: [...future, lastAction]
        }
      };
    });
  }, []);

  // Redo operation
  const redo = useCallback(() => {
    setState(prevState => {
      const { past, future } = prevState.undoRedo;
      if (future.length === 0) return prevState;
      
      const nextAction = future[future.length - 1];
      const newFuture = future.slice(0, future.length - 1);
      
      // Apply redo logic based on action type
      let newState = { ...prevState };
      
      if (nextAction.type === 'cell-update') {
        const { cellId, newCell } = nextAction.data;
        newState.data = {
          ...newState.data,
          [cellId]: newCell
        };
      } else if (nextAction.type === 'style-update') {
        const { oldCells, style } = nextAction.data;
        Object.keys(oldCells).forEach(cellId => {
          newState.data[cellId] = {
            ...newState.data[cellId] || oldCells[cellId],
            style: {
              ...oldCells[cellId].style,
              ...style
            }
          };
        });
      } else if (nextAction.type === 'column-resize') {
        const { col, newWidth } = nextAction.data;
        newState.columnWidths = {
          ...newState.columnWidths,
          [col]: newWidth
        };
      } else if (nextAction.type === 'row-resize') {
        const { row, newHeight } = nextAction.data;
        newState.rowHeights = {
          ...newState.rowHeights,
          [row]: newHeight
        };
      }
      
      // Recalculate formulas if needed
      if (nextAction.type === 'cell-update') {
        formulaEngineRef.current = new FormulaEngine(newState.data);
        const recalculatedData = formulaEngineRef.current.recalculateAll();
        Object.assign(newState.data, recalculatedData);
      }
      
      return {
        ...newState,
        undoRedo: {
          past: [...past, nextAction],
          future: newFuture
        }
      };
    });
  }, []);

  // Update search term
  const setSearchTerm = useCallback((term: string) => {
    setState(prevState => ({
      ...prevState,
      searchTerm: term
    }));
  }, []);

  // Apply filter to a column
  const applyFilter = useCallback((col: number, filterOptions: any) => {
    setState(prevState => ({
      ...prevState,
      filterOptions: {
        ...prevState.filterOptions,
        [col]: filterOptions
      }
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      filterOptions: {}
    }));
  }, []);

  // Sort by column
  const sortByColumn = useCallback((col: number, direction: 'asc' | 'desc') => {
    setState(prevState => ({
      ...prevState,
      isSorted: { col, direction }
    }));
  }, []);

  // Clear sorting
  const clearSorting = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isSorted: null
    }));
  }, []);

  // Import data
  const importData = useCallback((gridData: GridData, dimensions: SheetDimensions) => {
    setState(prevState => ({
      ...prevState,
      data: gridData,
      dimensions,
      activeCell: null,
      selectionRange: null,
      isEditing: false,
      toolbarOptions: initialToolbarOptions
    }));
  }, []);

  return {
    state,
    updateCellValue,
    applyStyle,
    setActiveCell,
    setSelectionRange,
    setIsEditing,
    handleCopy,
    handlePaste,
    resizeColumn,
    resizeRow,
    undo,
    redo,
    setSearchTerm,
    applyFilter,
    clearFilters,
    sortByColumn,
    clearSorting,
    importData
  };
}