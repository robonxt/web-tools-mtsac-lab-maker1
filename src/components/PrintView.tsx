import React from 'react';
import {
  AudienceMode,
  Course,
  LabDocument,
  LayoutProfile,
  PageSetup,
  ReusableModule,
} from '../types/lab';
import { buildVariableMap } from '../lib/variables';
import { computePageGeometry, resolvePageSetup } from '../lib/pageGeometry';
import { PaperCanvas } from './PaperCanvas';

interface PrintViewProps {
  lab?: LabDocument;
  course?: Course;
  layout?: LayoutProfile;
  pageSetup?: PageSetup;
  globalVariables: Record<string, string>;
  modules: ReusableModule[];
  audienceMode: AudienceMode;
}

export const PrintView: React.FC<PrintViewProps> = ({
  lab,
  course,
  layout,
  pageSetup,
  globalVariables,
  modules,
  audienceMode,
}) => {
  if (!lab || !layout) return null;
  const effectiveSetup = pageSetup || resolvePageSetup(layout, lab);
  const geometry = computePageGeometry(effectiveSetup);
  const variables = buildVariableMap(globalVariables, course, lab);

  return (
    <div className="print-only-root">
      {/* Dynamic @page rule matching the exact selected paper size & portrait/landscape orientation */}
      <style>{`@media print { @page { size: ${geometry.cssAtPageSize}; margin: 0; } }`}</style>
      <PaperCanvas
        lab={lab}
        course={course}
        layout={layout}
        pageSetup={effectiveSetup}
        audienceMode={audienceMode}
        variables={variables}
        showRawTokens={false}
        modules={modules}
        selectedBlockId={null}
        zoom={100}
        readOnly={true}
        printMode={true}
      />
    </div>
  );
};
