import { useState } from 'react';

export type DateRangeOption = '7' | '30' | '90';

export function useDateRange() {
  const [range, setRange] = useState<DateRangeOption>('30');
  const options: DateRangeOption[] = ['7', '30', '90'];

  return {
    range,
    setRange,
    options,
  };
}
