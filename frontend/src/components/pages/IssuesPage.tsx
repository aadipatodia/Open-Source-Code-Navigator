import React from 'react';
import { Box } from '@mui/material';
import { TravelExploreRounded } from '@mui/icons-material';

import SectionHeader from '../common/SectionHeader';
import IssueFinder from '../IssueFinder';
import { useAppData } from '../../context/AppDataContext';

const IssuesPage: React.FC = () => {
  const {
    issueGroups,
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
        subtitle="Type in some skills, open a project that needs help, and pick an issue to get a personalized contribution plan."
      />
      <IssueFinder
        onFindIssues={findIssues}
        onSelectIssue={openGuideForIssue}
        loading={issuesLoading}
        groups={issueGroups}
        error={issuesError}
      />
    </Box>
  );
};

export default IssuesPage;
