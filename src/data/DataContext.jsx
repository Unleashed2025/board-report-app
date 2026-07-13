import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { defaultSalesData } from './salesData.js';
import parseExcel from './parseExcel.js';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(defaultSalesData);
  const [boardPlan, setBoardPlan] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sourceFilename, setSourceFilename] = useState('');

  const updateFromExcel = useCallback((workbook, filename = '') => {
    console.log('[DataContext] updateFromExcel called with:', filename, 'sheets:', workbook.SheetNames);
    const nextData = parseExcel(workbook);
    console.log('[DataContext] parsed data:', nextData.boardPlan ? 'boardPlan found' : 'NO boardPlan', 'deals:', nextData.boardPlan?.closedWonDeals?.length, 'neg:', nextData.boardPlan?.negotiatingDeals?.length);
    const { boardPlan: plan, ...salesData } = nextData;
    setData(salesData);
    setBoardPlan(plan || null);
    setDataLoaded(true);
    setLastUpdated(new Date());
    setSourceFilename(filename || workbook?.Props?.Title || 'Uploaded workbook');
  }, []);

  const value = useMemo(
    () => ({
      ...data,
      boardPlan,
      dataLoaded,
      lastUpdated,
      sourceFilename,
      updateFromExcel,
    }),
    [data, boardPlan, dataLoaded, lastUpdated, sourceFilename, updateFromExcel],
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
