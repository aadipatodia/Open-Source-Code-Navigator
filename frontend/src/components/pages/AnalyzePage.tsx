import React from 'react';
import { Box } from '@mui/material';
import { BiotechRounded } from '@mui/icons-material';

import SectionHeader from '../common/SectionHeader';
import CodeInput from '../CodeInput';
import { useAppData } from '../../context/AppDataContext';

const AnalyzePage: React.FC = () => {
  const { addAnalysis } = useAppData();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SectionHeader
        icon={<BiotechRounded />}
        eyebrow="CODE ANALYSIS"
        title="Explain & review any code"
        subtitle="Paste a snippet and Gemini will explain what it does, flag security issues, and suggest a fix."
      />
      <CodeInput onAnalysisComplete={(preview) => addAnalysis(preview)} />
    </Box>
  );
};

export default AnalyzePage;
