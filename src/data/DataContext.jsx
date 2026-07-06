import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { defaultSalesData } from './salesData.js';
import parseExcel from './parseExcel.js';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(defaultSalesData);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sourceFilename, setSourceFilename] = useState('');

  const updateFromExcel = useCallback((workbook, filename = '') => {
    const nextData = parseExcel(workbook);
    setData(nextData);
    setDataLoaded(true);
    setLastUpdated(new Date());
    setSourceFilename(filename || workbook?.Props?.Title || 'Uploaded workbook');
  }, []);

  const value = useMemo(
    () => ({
      ...data,
      dataLoaded,
      lastUpdated,
      sourceFilename,
      updateFromExcel,
    }),
    [data, dataLoaded, lastUpdated, sourceFilename, updateFromExcel],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error('useData must be used within a DataProvider.');
  }

  return context;
}
