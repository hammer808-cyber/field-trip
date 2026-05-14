import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FieldTypeId } from '../constants';

interface DevOverrides {
  date: string | null;
  points: number | null;
  soloCount: number | null;
  fieldType: FieldTypeId | null;
  isAdmin: boolean | null;
  forceUnlocked: boolean;
}

interface DevContextType {
  overrides: DevOverrides;
  setOverrides: React.Dispatch<React.SetStateAction<DevOverrides>>;
  isDevMode: boolean;
}

const DevContext = createContext<DevContextType | undefined>(undefined);

export function DevProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<DevOverrides>({
    date: null,
    points: null,
    soloCount: null,
    fieldType: null,
    isAdmin: null,
    forceUnlocked: false,
  });

  const isDevMode = process.env.NODE_ENV === 'development';

  return (
    <DevContext.Provider value={{ overrides, setOverrides, isDevMode }}>
      {children}
    </DevContext.Provider>
  );
}

export function useDev() {
  const context = useContext(DevContext);
  if (!context) throw new Error('useDev must be used within DevProvider');
  return context;
}
