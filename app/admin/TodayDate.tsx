'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function TodayDate() {
  const [label, setLabel] = useState('');
  useEffect(() => { setLabel(format(new Date(), 'EEEE, MMMM d, yyyy')); }, []);
  return <>{label}</>;
}
