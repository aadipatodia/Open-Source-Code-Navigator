import React from 'react';
import { Box } from '@mui/material';
import { TravelExploreRounded } from '@mui/icons-material';

import SectionHeader from '../common/SectionHeader';
import IssueFinder from '../IssueFinder';
import { useAppData } from '../../context/AppDataContext';

const IssuesPage: React.FC = () => {
  const {
    issues,
    issuesLoading,
    issuesError,
    findIssues,
    openGuideForIssue,
  } = useAppData();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SectionHeader
        icon={<TravelExploreRounded />}
        eyebrow="OPEN-SOURCE ON-RAMP"
        title="Find a beginner-friendly issue"
        subtitle="Type in some skills, pick an issue, and we'll generate a personalized contribution plan."
      />
      <IssueFinder
        onFindIssues={findIssues}
        onSelectIssue={openGuideForIssue}
        loading={issuesLoading}
        issues={issues}
        error={issuesError}
      />
    </Box>
  );
};

export default IssuesPage;
