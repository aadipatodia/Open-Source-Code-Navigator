import React from 'react';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from '@mui/material';
import { Close as CloseIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

// Define the shape of a single contribution step
interface ContributionStep {
  step: number;
  title: string;
  details: string;
}

interface GuidedContributionProps {
  open: boolean;
  onClose: () => void;
  plan: ContributionStep[] | null;
  loading: boolean;
  error: string;
  issueTitle: string;
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 800,
  bgcolor: '#1A1A2E',
  border: '2px solid #00CED1',
  boxShadow: 24,
  p: 4,
  color: 'white',
  borderRadius: '16px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
};

const GuidedContribution: React.FC<GuidedContributionProps> = ({ open, onClose, plan, loading, error, issueTitle }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="guided-contribution-title"
    >
      <Box sx={style}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography id="guided-contribution-title" variant="h5" component="h2" sx={{ color: '#A8FF00' }}>
            AI Contribution Plan
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body1" sx={{ fontStyle: 'italic', mb: 2 }}>
          For issue: "{issueTitle}"
        </Typography>

        <Paper sx={{ flexGrow: 1, overflowY: 'auto', p: 2, background: 'rgba(0,0,0,0.2)' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress sx={{ mr: 2 }} />
              <Typography>Generating your personalized contribution guide...</Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && plan && (
            plan.map((step, index) => (
              <Accordion 
                key={index} 
                defaultExpanded={index === 0}
                sx={{ 
                    bgcolor: '#16213E', 
                    color: 'white', 
                    mb: 1,
                    '&.Mui-expanded': {
                        margin: '8px 0',
                    }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#00CED1' }} />}
                  aria-controls={`panel${index}-content`}
                  id={`panel${index}-header`}
                >
                  <Typography sx={{ fontWeight: 'bold' }}>Step {step.step}: {step.title}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'rgba(0,0,0,0.3)', borderTop: '1px solid #00CED1' }}>
                  <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: '"Fira Code", monospace' }}>
                    {step.details}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Paper>
      </Box>
    </Modal>
  );
};

export default GuidedContribution;