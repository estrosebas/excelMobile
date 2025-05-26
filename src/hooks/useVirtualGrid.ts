import { useState, useEffect, useRef, useCallback } from 'react';
import type { CellRange, SheetDimensions } from '../types';
import { getVisibleCellRange, getGridWidth, getGridHeight } from '../utils/gridUtils';

const DEFAULT_CELL_WIDTH = 100;
const DEFAULT_CELL_HEIGHT = 24;
const HEADER_WIDTH = 40;
const HEADER_HEIGHT = 24;

export function useVirtualGrid(
  dimensions: SheetDimensions,
  columnWidths: { [key: number]: number },
  rowHeights: { [key: number]: number }
) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState<CellRange>({
    start: { row: 1, col: 1 },
    end: { row: 30, col: 10 }
  });
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 });
  const [gridSize, setGridSize] = useState({
    width: 0,
    height: 0,
    viewportWidth: 0,
    viewportHeight: 0
  });

  // Calculate grid dimensions
  useEffect(() => {
    const totalWidth = getGridWidth(
      dimensions,
      columnWidths,
      DEFAULT_CELL_WIDTH,
      HEADER_WIDTH
    );
    
    const totalHeight = getGridHeight(
      dimensions,
      rowHeights,
      DEFAULT_CELL_HEIGHT,
      HEADER_HEIGHT
    );
    
    setGridSize(prev => ({
      ...prev,
      width: totalWidth,
      height: totalHeight
    }));
  }, [dimensions, columnWidths, rowHeights]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!gridRef.current) return;
    
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = gridRef.current;
    
    setScrollPosition({ left: scrollLeft, top: scrollTop });
    
    // Update viewport size
    setGridSize(prev => ({
      ...prev,
      viewportWidth: clientWidth,
      viewportHeight: clientHeight
    }));
    
    // Calculate visible cell range
    const newVisibleRange = getVisibleCellRange(
      scrollLeft,
      scrollTop,
      clientWidth,
      clientHeight,
      columnWidths,
      rowHeights,
      DEFAULT_CELL_WIDTH,
      DEFAULT_CELL_HEIGHT,
      HEADER_HEIGHT,
      HEADER_WIDTH
    );
    
    setVisibleRange(newVisibleRange);
  }, [columnWidths, rowHeights]);

  // Initialize and set up event listeners
  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;
    
    gridElement.addEventListener('scroll', handleScroll);
    
    // Calculate initial visible range
    handleScroll();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      setGridSize(prev => ({
        ...prev,
        viewportWidth: gridElement.clientWidth,
        viewportHeight: gridElement.clientHeight
      }));
      handleScroll();
    });
    
    resizeObserver.observe(gridElement);
    
    return () => {
      gridElement.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [handleScroll]);

  // Scroll to a specific cell
  const scrollToCell = useCallback((row: number, col: number) => {
    if (!gridRef.current) return;
    
    let left = HEADER_WIDTH;
    for (let i = 1; i < col; i++) {
      left += columnWidths[i] || DEFAULT_CELL_WIDTH;
    }
    
    let top = HEADER_HEIGHT;
    for (let i = 1; i < row; i++) {
      top += rowHeights[i] || DEFAULT_CELL_HEIGHT;
    }
    
    gridRef.current.scrollTo({
      left: left - HEADER_WIDTH,
      top: top - HEADER_HEIGHT,
      behavior: 'smooth'
    });
  }, [columnWidths, rowHeights]);

  return {
    gridRef,
    visibleRange,
    scrollPosition,
    gridSize,
    scrollToCell,
    defaultCellWidth: DEFAULT_CELL_WIDTH,
    defaultCellHeight: DEFAULT_CELL_HEIGHT,
    headerWidth: HEADER_WIDTH,
    headerHeight: HEADER_HEIGHT
  };
}