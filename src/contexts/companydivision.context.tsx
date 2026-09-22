'use client'
// context/DivisionContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

export interface Division {
  id: number;
  division: string;
  companyId:number;
}

interface DivisionContextProps {
  selectedDivision: Division | null;
  setSelectedDivision: (division: Division | null) => void;
}

const DivisionContext = createContext<DivisionContextProps | undefined>(undefined);

export const DivisionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);

  return (
    <DivisionContext.Provider value={{ selectedDivision, setSelectedDivision }}>
      {children}
    </DivisionContext.Provider>
  );
};

export const useDivision = (): DivisionContextProps => {
  const context = useContext(DivisionContext);
  if (!context) throw new Error('useDivision must be used within a DivisionProvider');
  return context;
};
