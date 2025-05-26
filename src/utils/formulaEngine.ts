import type { GridData, Cell, CellId } from '../types';
import { generateCellId, parseCellId } from './cellUtils';

// Simple formula parser and evaluator
export class FormulaEngine {
  private gridData: GridData;
  private calculatingCells: Set<CellId> = new Set();

  constructor(gridData: GridData) {
    this.gridData = gridData;
  }

  // Evaluate a formula
  evaluate(formula: string, cellId: CellId): any {
    if (!formula.startsWith('=')) {
      return formula; // Not a formula
    }

    // Remove the '=' prefix and trim
    const expression = formula.substring(1).trim();

    // Check for circular references
    if (this.calculatingCells.has(cellId)) {
      throw new Error('Circular reference detected');
    }

    try {
      this.calculatingCells.add(cellId);
      return this.evaluateExpression(expression);
    } catch (error) {
      console.error('Formula error:', error);
      return '#ERROR!';
    } finally {
      this.calculatingCells.delete(cellId);
    }
  }

  // Evaluate a mathematical expression
  private evaluateExpression(expression: string): any {
    // Check for functions
    const functionMatch = expression.match(/^([A-Z]+)\((.*)\)$/);
    if (functionMatch) {
      const functionName = functionMatch[1];
      const args = this.parseArguments(functionMatch[2]);
      
      switch (functionName) {
        case 'SUM':
          return this.sum(args);
        case 'AVERAGE':
          return this.average(args);
        case 'COUNT':
          return this.count(args);
        case 'MAX':
          return this.max(args);
        case 'MIN':
          return this.min(args);
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    }

    // Replace cell references with their values
    const cellRefRegex = /([A-Z]+)(\d+)/g;
    const expressionWithValues = expression.replace(cellRefRegex, (match, col, row) => {
      const cellId = generateCellId(parseInt(row, 10), parseInt(col, 10));
      const cell = this.gridData[cellId];
      
      if (!cell) {
        return '0'; // Empty cell evaluates to 0
      }
      
      if (cell.formula) {
        return this.evaluate(cell.formula, cellId).toString();
      }
      
      return cell.value !== null ? cell.value.toString() : '0';
    });

    // Evaluate the expression
    try {
      // Use Function constructor to evaluate mathematical expression
      // This is simplified and not secure for production use
      return new Function(`return ${expressionWithValues}`)();
    } catch (error) {
      throw new Error('Invalid expression');
    }
  }

  // Parse arguments for a function
  private parseArguments(argsString: string): any[] {
    // Simple parsing for now, can be extended for more complex scenarios
    return argsString.split(',').map(arg => {
      arg = arg.trim();
      
      // Check if it's a cell reference
      const cellRefMatch = arg.match(/([A-Z]+)(\d+)/);
      if (cellRefMatch) {
        const col = cellRefMatch[1];
        const row = parseInt(cellRefMatch[2], 10);
        const cellId = generateCellId(row, this.columnLetterToIndex(col));
        const cell = this.gridData[cellId];
        
        if (!cell) {
          return 0; // Empty cell evaluates to 0
        }
        
        if (cell.formula) {
          return this.evaluate(cell.formula, cellId);
        }
        
        return cell.value !== null ? cell.value : 0;
      }
      
      // Check if it's a range (e.g., A1:A10)
      const rangeMatch = arg.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (rangeMatch) {
        const startCol = rangeMatch[1];
        const startRow = parseInt(rangeMatch[2], 10);
        const endCol = rangeMatch[3];
        const endRow = parseInt(rangeMatch[4], 10);
        
        const values = [];
        for (let row = startRow; row <= endRow; row++) {
          for (let col = this.columnLetterToIndex(startCol); col <= this.columnLetterToIndex(endCol); col++) {
            const cellId = generateCellId(row, col);
            const cell = this.gridData[cellId];
            
            if (cell) {
              if (cell.formula) {
                values.push(this.evaluate(cell.formula, cellId));
              } else {
                values.push(cell.value !== null ? cell.value : 0);
              }
            } else {
              values.push(0);
            }
          }
        }
        
        return values;
      }
      
      // Otherwise, it's a literal value
      return isNaN(Number(arg)) ? arg : Number(arg);
    });
  }

  // SUM function
  private sum(args: any[]): number {
    return this.flattenArgs(args).reduce((sum, value) => sum + (Number(value) || 0), 0);
  }

  // AVERAGE function
  private average(args: any[]): number {
    const values = this.flattenArgs(args).filter(value => value !== null && value !== undefined);
    return values.length > 0 ? this.sum(values) / values.length : 0;
  }

  // COUNT function
  private count(args: any[]): number {
    return this.flattenArgs(args).filter(value => value !== null && value !== undefined).length;
  }

  // MAX function
  private max(args: any[]): number {
    const values = this.flattenArgs(args).filter(value => !isNaN(Number(value)));
    return values.length > 0 ? Math.max(...values.map(v => Number(v))) : 0;
  }

  // MIN function
  private min(args: any[]): number {
    const values = this.flattenArgs(args).filter(value => !isNaN(Number(value)));
    return values.length > 0 ? Math.min(...values.map(v => Number(v))) : 0;
  }

  // Convert column letter to index (A=1, B=2, etc.)
    private columnLetterToIndex(column: string): number {
      let result = 0;
      for (let i = 0; i < column.length; i++) {
        result *= 26;
        result += column.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
      }
      return result;
    }
  
    // Helper to flatten nested arrays
    private flattenArgs(args: any[]): any[] {
    return args.reduce((flat, arg) => {
      return flat.concat(Array.isArray(arg) ? this.flattenArgs(arg) : arg);
    }, []);
  }

  // Recalculate all cells with formulas
  recalculateAll(): GridData {
    const updatedGridData = { ...this.gridData };
    
    // First, identify all cells with formulas
    const formulaCells: Cell[] = [];
    for (const cellId in this.gridData) {
      const cell = this.gridData[cellId];
      if (cell.formula) {
        formulaCells.push(cell);
      }
    }
    
    // Then evaluate them all
    for (const cell of formulaCells) {
      try {
        const result = this.evaluate(cell.formula!, cell.id);
        updatedGridData[cell.id] = {
          ...cell,
          value: result,
        };
      } catch (error) {
        updatedGridData[cell.id] = {
          ...cell,
          value: '#ERROR!',
        };
      }
    }
    
    return updatedGridData;
  }
}