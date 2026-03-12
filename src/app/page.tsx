'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';

interface HistoryEntry {
  id: number;
  expression: string;
  result: string;
  createdAt: string;
}

type ButtonType = 'number' | 'operator' | 'equals' | 'clear' | 'special';

interface CalcButton {
  label: string;
  value: string;
  type: ButtonType;
  wide?: boolean;
}

const BUTTONS: CalcButton[] = [
  { label: 'AC', value: 'clear', type: 'clear' },
  { label: '+/-', value: 'negate', type: 'special' },
  { label: '%', value: 'percent', type: 'special' },
  { label: '÷', value: '/', type: 'operator' },

  { label: '7', value: '7', type: 'number' },
  { label: '8', value: '8', type: 'number' },
  { label: '9', value: '9', type: 'number' },
  { label: '×', value: '*', type: 'operator' },

  { label: '4', value: '4', type: 'number' },
  { label: '5', value: '5', type: 'number' },
  { label: '6', value: '6', type: 'number' },
  { label: '−', value: '-', type: 'operator' },

  { label: '1', value: '1', type: 'number' },
  { label: '2', value: '2', type: 'number' },
  { label: '3', value: '3', type: 'number' },
  { label: '+', value: '+', type: 'operator' },

  { label: '0', value: '0', type: 'number', wide: true },
  { label: '.', value: '.', type: 'number' },
  { label: '=', value: '=', type: 'equals' },
];

export default function Home() {
  const [display, setDisplay] = useState<string>('0');
  const [expression, setExpression] = useState<string>('');
  const [prevValue, setPrevValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json() as { history: HistoryEntry[] };
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const saveToHistory = async (expr: string, result: string) => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr, result }),
      });
      await fetchHistory();
    } catch (err) {
      console.error('Failed to save history', err);
    }
  };

  const clearHistory = async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  };

  const formatNumber = (num: string): string => {
    if (num === 'Error' || num === 'Infinity' || num === '-Infinity' || num === 'NaN') {
      return num;
    }
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return '0';
    if (Math.abs(parsed) >= 1e15) {
      return parsed.toExponential(6);
    }
    const formatted = parseFloat(parsed.toPrecision(12)).toString();
    return formatted;
  };

  const calculate = (a: string, op: string, b: string): string => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    let result: number;
    switch (op) {
      case '+':
        result = numA + numB;
        break;
      case '-':
        result = numA - numB;
        break;
      case '*':
        result = numA * numB;
        break;
      case '/':
        if (numB === 0) return 'Error';
        result = numA / numB;
        break;
      default:
        return b;
    }
    return formatNumber(result.toString());
  };

  const handleButton = useCallback((btn: CalcButton) => {
    if (btn.value === 'clear') {
      setDisplay('0');
      setExpression('');
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(false);
      return;
    }

    if (btn.value === 'negate') {
      if (display === 'Error') return;
      const negated = (parseFloat(display) * -1).toString();
      setDisplay(negated);
      return;
    }

    if (btn.value === 'percent') {
      if (display === 'Error') return;
      const pct = (parseFloat(display) / 100).toString();
      setDisplay(formatNumber(pct));
      return;
    }

    if (btn.type === 'operator') {
      if (display === 'Error') return;
      if (prevValue !== null && operator && !waitingForOperand) {
        const result = calculate(prevValue, operator, display);
        setDisplay(result);
        setPrevValue(result);
        setExpression(`${result} ${btn.label}`);
      } else {
        setPrevValue(display);
        setExpression(`${display} ${btn.label}`);
      }
      setOperator(btn.value);
      setWaitingForOperand(true);
      return;
    }

    if (btn.value === '=') {
      if (display === 'Error') return;
      if (prevValue !== null && operator) {
        const expr = `${prevValue} ${operator === '+' ? '+' : operator === '-' ? '−' : operator === '*' ? '×' : '÷'} ${display}`;
        const result = calculate(prevValue, operator, display);
        setDisplay(result);
        setExpression(`${expr} =`);
        void saveToHistory(expr, result);
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(true);
      }
      return;
    }

    if (btn.value === '.') {
      if (waitingForOperand) {
        setDisplay('0.');
        setWaitingForOperand(false);
        return;
      }
      if (!display.includes('.')) {
        setDisplay(display + '.');
      }
      return;
    }

    // digit
    if (waitingForOperand) {
      setDisplay(btn.value);
      setWaitingForOperand(false);
    } else {
      if (display === '0') {
        setDisplay(btn.value);
      } else if (display.replace('-', '').replace('.', '').length >= 15) {
        return;
      } else {
        setDisplay(display + btn.value);
      }
    }
  }, [display, prevValue, operator, waitingForOperand]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key >= '0' && key <= '9') {
        handleButton({ label: key, value: key, type: 'number' });
      } else if (key === '.') {
        handleButton({ label: '.', value: '.', type: 'number' });
      } else if (key === '+') {
        handleButton({ label: '+', value: '+', type: 'operator' });
      } else if (key === '-') {
        handleButton({ label: '−', value: '-', type: 'operator' });
      } else if (key === '*') {
        handleButton({ label: '×', value: '*', type: 'operator' });
      } else if (key === '/') {
        e.preventDefault();
        handleButton({ label: '÷', value: '/', type: 'operator' });
      } else if (key === 'Enter' || key === '=') {
        handleButton({ label: '=', value: '=', type: 'equals' });
      } else if (key === 'Escape') {
        handleButton({ label: 'AC', value: 'clear', type: 'clear' });
      } else if (key === 'Backspace') {
        if (display.length > 1 && display !== 'Error') {
          setDisplay(display.slice(0, -1));
        } else {
          setDisplay('0');
        }
      } else if (key === '%') {
        handleButton({ label: '%', value: 'percent', type: 'special' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButton, display]);

  const getButtonClass = (btn: CalcButton): string => {
    const classes = [styles.button];
    if (btn.type === 'operator') classes.push(styles.operatorBtn);
    if (btn.type === 'equals') classes.push(styles.equalsBtn);
    if (btn.type === 'clear') classes.push(styles.clearBtn);
    if (btn.type === 'special') classes.push(styles.specialBtn);
    if (btn.wide) classes.push(styles.wideBtn);
    return classes.join(' ');
  };

  const displayFontSize = display.length > 12 ? '1.4rem' : display.length > 9 ? '1.8rem' : display.length > 6 ? '2.2rem' : '2.8rem';

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.calculator}>
          <div className={styles.header}>
            <h1 className={styles.title}>Calculator</h1>
            <button
              className={styles.historyToggle}
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) fetchHistory();
              }}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>

          <div className={styles.display}>
            <div className={styles.expression}>{expression || '\u00A0'}</div>
            <div className={styles.currentValue} style={{ fontSize: displayFontSize }}>
              {display}
            </div>
          </div>

          <div className={styles.buttons}>
            {BUTTONS.map((btn) => (
              <button
                key={btn.label}
                className={getButtonClass(btn)}
                onClick={() => handleButton(btn)}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className={styles.keyboardHint}>
            Keyboard supported — press Esc to clear, Backspace to delete
          </div>
        </div>

        {showHistory && (
          <div className={styles.historyPanel}>
            <div className={styles.historyHeader}>
              <h2 className={styles.historyTitle}>History</h2>
              <button className={styles.clearHistoryBtn} onClick={clearHistory}>
                Clear All
              </button>
            </div>
            <div className={styles.historyList}>
              {historyLoading ? (
                <div className={styles.historyEmpty}>Loading...</div>
              ) : history.length === 0 ? (
                <div className={styles.historyEmpty}>No calculations yet</div>
              ) : (
                history.map((entry) => (
                  <div key={entry.id} className={styles.historyItem}>
                    <div className={styles.historyExpression}>{entry.expression}</div>
                    <div className={styles.historyResult}>= {entry.result}</div>
                    <div className={styles.historyDate}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
