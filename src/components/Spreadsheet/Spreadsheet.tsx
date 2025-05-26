import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, Search, FileSpreadsheet, Copy, X, Filter, ArrowUpDown,
  Upload, Download, Trash, Plus, Info, FileInput, CheckSquare
} from 'lucide-react';
import { useSpreadsheetState } from '../../hooks/useSpreadsheetState';
import { useVirtualGrid } from '../../hooks/useVirtualGrid';
import type { CellPosition } from '../../types';
import { columnIndexToLetter, generateCellId } from '../../utils/cellUtils';
import { Grid } from '../Grid/Grid';
import { importExcel, exportExcel } from '../../utils/importExport';
import './Spreadsheet.css';

export function Spreadsheet() {
  const {
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
  } = useSpreadsheetState();

  const {
    gridRef,
    visibleRange,
    gridSize,
    scrollToCell,
    defaultCellWidth,
    defaultCellHeight,
    headerWidth,
    headerHeight
  } = useVirtualGrid(
    state.dimensions,
    state.columnWidths,
    state.rowHeights
  );

  const [formula, setFormula] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.activeCell) {
      const cellId = generateCellId(state.activeCell.row, state.activeCell.col);
      const cell = state.data[cellId];
      setFormula(cell?.formula || String(cell?.value || ''));
    } else {
      setFormula('');
    }
  }, [state.activeCell, state.data]);

  const handleFormulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormula(e.target.value);
  };

  const handleFormulaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && state.activeCell) {
      e.preventDefault();
      updateCellValue(state.activeCell.row, state.activeCell.col, formula);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const { gridData, dimensions } = await importExcel(file);
      importData(gridData, dimensions);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error al importar:', error);
      alert('Error al importar el archivo. Por favor, inténtelo de nuevo.');
    }
  };

  const handleExport = () => {
    exportExcel(state.data, state.dimensions, 'hoja_de_calculo.xlsx');
  };

  const getActiveCellAddress = () => {
    if (!state.activeCell) return '';
    const column = columnIndexToLetter(state.activeCell.col);
    return `${column}${state.activeCell.row}`;
  };

  return (
    <div className="spreadsheet">
      <div className="spreadsheet-header">
        <h1>Hoja de Cálculo</h1>
        <div className="header-buttons">
          <button 
            className="import-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={20} />
            <span>Importar Excel</span>
          </button>
          <button 
            className="export-button"
            onClick={handleExport}
          >
            <Download size={20} />
            <span>Exportar Excel</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden-input"
          />
        </div>
      </div>
      
      <div className="spreadsheet-toolbar">
        <div className="toolbar-group">
          <button 
            className={`toolbar-button ${state.toolbarOptions.bold ? 'active' : ''}`}
            onClick={() => applyStyle({ bold: !state.toolbarOptions.bold })}
            disabled={!state.activeCell && !state.selectionRange}
            title="Negrita"
          >
            <Bold size={18} />
          </button>
          <button 
            className={`toolbar-button ${state.toolbarOptions.italic ? 'active' : ''}`}
            onClick={() => applyStyle({ italic: !state.toolbarOptions.italic })}
            disabled={!state.activeCell && !state.selectionRange}
            title="Cursiva"
          >
            <Italic size={18} />
          </button>
          <button 
            className={`toolbar-button ${state.toolbarOptions.underline ? 'active' : ''}`}
            onClick={() => applyStyle({ underline: !state.toolbarOptions.underline })}
            disabled={!state.activeCell && !state.selectionRange}
            title="Subrayado"
          >
            <Underline size={18} />
          </button>
        </div>
        
        <div className="toolbar-separator"></div>
        
        <div className="toolbar-group">
          <button 
            className={`toolbar-button ${state.toolbarOptions.textAlign === 'left' ? 'active' : ''}`}
            onClick={() => applyStyle({ textAlign: 'left' })}
            disabled={!state.activeCell && !state.selectionRange}
            title="Alinear a la izquierda"
          >
            <AlignLeft size={18} />
          </button>
          <button 
            className={`toolbar-button ${state.toolbarOptions.textAlign === 'center' ? 'active' : ''}`}
            onClick={() => applyStyle({ textAlign: 'center' })}
            disabled={!state.activeCell && !state.selectionRange}
            title="Centrar"
          >
            <AlignCenter size={18} />
          </button>
          <button 
            className={`toolbar-button ${state.toolbarOptions.textAlign === 'right' ? 'active' : ''}`}
            onClick={() => applyStyle({ textAlign: 'right' })}
            disabled={!state.activeCell && !state.selectionRange}
            title="Alinear a la derecha"
          >
            <AlignRight size={18} />
          </button>
        </div>
        
        <div className="toolbar-separator"></div>
        
        <div className="toolbar-group">
          <button 
            className="toolbar-button"
            onClick={undo}
            disabled={state.undoRedo.past.length === 0}
            title="Deshacer"
          >
            <Undo size={18} />
          </button>
          <button 
            className="toolbar-button"
            onClick={redo}
            disabled={state.undoRedo.future.length === 0}
            title="Rehacer"
          >
            <Redo size={18} />
          </button>
        </div>
        
        <div className="toolbar-separator"></div>
        
        <div className="toolbar-group">
          <button 
            className="toolbar-button"
            onClick={() => {
              if (state.activeCell) {
                handleCopy();
              }
            }}
            disabled={!state.activeCell && !state.selectionRange}
            title="Copiar"
          >
            <Copy size={18} />
          </button>
          <button 
            className="toolbar-button"
            onClick={() => {
              if (Object.keys(state.filterOptions).length > 0) {
                clearFilters();
              }
            }}
            disabled={Object.keys(state.filterOptions).length === 0}
            title="Limpiar filtros"
          >
            <Filter size={18} />
          </button>
          <button 
            className="toolbar-button"
            onClick={() => {
              if (state.isSorted) {
                clearSorting();
              }
            }}
            disabled={!state.isSorted}
            title="Limpiar ordenamiento"
          >
            <ArrowUpDown size={18} />
          </button>
        </div>
      </div>
      
      {showSearch && (
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar..."
            value={state.searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <button 
            className="search-close"
            onClick={() => {
              setSearchTerm('');
              setShowSearch(false);
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
      
      <div className="formula-bar">
        <div className="cell-address">{getActiveCellAddress()}</div>
        <input
          type="text"
          className="formula-input"
          value={formula}
          onChange={handleFormulaChange}
          onKeyDown={handleFormulaKeyDown}
          placeholder="Ingrese fórmula o valor"
          disabled={!state.activeCell}
        />
      </div>
      
      <div className="grid-container" ref={gridRef}>
        <Grid
          data={state.data}
          visibleRange={visibleRange}
          activeCell={state.activeCell}
          selectionRange={state.selectionRange}
          isEditing={state.isEditing}
          gridSize={gridSize}
          columnWidths={state.columnWidths}
          rowHeights={state.rowHeights}
          defaultCellWidth={defaultCellWidth}
          defaultCellHeight={defaultCellHeight}
          headerWidth={headerWidth}
          headerHeight={headerHeight}
          onCellClick={setActiveCell}
          onCellDoubleClick={() => setIsEditing(true)}
          onCellValueChange={updateCellValue}
          onSelectionChange={setSelectionRange}
          onColumnResize={(col, width) => {
            setIsResizing(false);
            resizeColumn(col, width);
          }}
          onRowResize={(row, height) => {
            setIsResizing(false);
            resizeRow(row, height);
          }}
          onResizeStart={() => setIsResizing(true)}
          searchTerm={state.searchTerm}
          filterOptions={state.filterOptions}
          onFilterChange={applyFilter}
          isSorted={state.isSorted}
          onSort={sortByColumn}
        />
      </div>
      
      <div className="status-bar">
        {state.activeCell && (
          <span>
            Celda: {getActiveCellAddress()} | 
            {state.selectionRange ? (
              ` Selección: ${
                (state.selectionRange.end.row - state.selectionRange.start.row + 1) *
                (state.selectionRange.end.col - state.selectionRange.start.col + 1)
              } celdas`
            ) : ''}
          </span>
        )}
      </div>
    </div>
  );
}