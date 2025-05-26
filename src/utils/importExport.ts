import * as XLSX from 'xlsx';
import type { GridData } from '../types';
import type { SheetDimensions } from '../types';
import { columnLetterToIndex, generateCellId } from './cellUtils';

// Import Excel file
export const importExcel = (file: File): Promise<{
  gridData: GridData;
  dimensions: SheetDimensions;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse the sheet
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Create grid data
        const gridData: GridData = {};
        let maxRow = 0;
        let maxCol = 0;
        
        // Process cell data
        Object.keys(sheet).forEach((key) => {
          // Skip special keys
          if (key.startsWith('!')) return;
          
          // Parse the cell reference (e.g., "A1")
          const match = key.match(/([A-Z]+)(\d+)/);
          if (!match) return;
          
          const colLetter = match[1];
          const row = parseInt(match[2], 10);
          const col = columnLetterToIndex(colLetter);
          
          maxRow = Math.max(maxRow, row);
          maxCol = Math.max(maxCol, col);
          
          const cellId = generateCellId(row, col);
          const cellValue = sheet[key].v;
          
          gridData[cellId] = {
            id: cellId,
            value: cellValue,
            // We could also extract formulas, styles, etc. here
          };
        });
        
        resolve({
          gridData,
          dimensions: { rows: maxRow, cols: maxCol },
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
};

// Export to Excel file
export const exportExcel = (
  gridData: GridData,
  dimensions: SheetDimensions,
  fileName: string = 'spreadsheet.xlsx'
): void => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Create worksheet data
  const wsData: any[][] = [];
  
  // Fill in the data
  for (let row = 1; row <= dimensions.rows; row++) {
    const rowData: any[] = [];
    for (let col = 1; col <= dimensions.cols; col++) {
      const cellId = generateCellId(row, col);
      const cell = gridData[cellId];
      rowData.push(cell ? cell.value : null);
    }
    wsData.push(rowData);
  }
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, fileName);
};