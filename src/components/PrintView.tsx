import React from 'react';
import {
  AudienceMode,
  Course,
  LabDocument,
  LayoutProfile,
  ReusableModule,
} from '../types/lab';
import { buildVariableMap } from '../lib/variables';
import { PaperCanvas } from './PaperCanvas';

interface PrintViewProps {
  lab?: LabDocument;
  course?: Course;
  layout?: LayoutProfile;
  globalVariables: Record<string, string>;
  modules: ReusableModule[];
  audienceMode: AudienceMode;
}

export const PrintView: React.FC<PrintViewProps> = ({
  lab,
  course,
  layout,
  globalVariables,
  modules,
  audienceMode,
}) => {
  if (!lab || !layout) return null;
  const variables = buildVariableMap(globalVariables, course, lab);

  return (
    <div className="print-only-root">
      <PaperCanvas
        lab={lab}
        course={course}
        layout={layout}
        audienceMode={audienceMode}
        variables={variables}
        showRawTokens={false}
        modules={modules}
        selectedBlockId={null}
        zoom={100}
        readOnly={true}
      />
    </div>
  );
};
