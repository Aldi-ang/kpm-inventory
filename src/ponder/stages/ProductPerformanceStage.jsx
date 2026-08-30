/* The Product Performance stage: the REAL table, fed the fixed demo world.

   The panel around it owns the range buttons and the Firestore read; neither belongs in a
   tutorial, which must play the same way every time and must never spend a document read. What is
   taught here is how to READ the table, and the table is the real one. */
import React from 'react';
import ProductPerformanceTable from './ProductPerformanceTable.jsx';
import { DEMO_PERFORMANCE_ROWS, DEMO_PERFORMANCE_MISSING, DEMO_PERFORMANCE_MONTHS } from '../demo/productPerformance.js';

export default function ProductPerformanceStage() {
  return (
    <div className="py-5">
      <ProductPerformanceTable
        rows={DEMO_PERFORMANCE_ROWS}
        missing={DEMO_PERFORMANCE_MISSING}
        months={DEMO_PERFORMANCE_MONTHS}
        onRebuild
      />
    </div>
  );
}
