import { SpreadsheetProvider } from './context/SpreadsheetContext';
import { Spreadsheet } from './components/Spreadsheet';
import './App.css';

export function App() {
  return (
    <SpreadsheetProvider>
      <Spreadsheet />
    </SpreadsheetProvider>
  );
}

export default App;
