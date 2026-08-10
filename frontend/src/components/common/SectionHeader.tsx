import React from 'react';
import { Box, Typography } from '@mui/material';
import { brand } from '../../theme/theme';
import IconTile from './IconTile';

interface SectionHeaderProps {
  icon?: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  eyebrow,
  title,
  subtitle,
  action,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        {icon && <IconTile color={brand.primary}>{icon}</IconTile>}
        <Box sx={{ minWidth: 0 }}>
          {eyebrow && (
            <Typography
              variant="overline"
              sx={{ color: brand.secondary, letterSpacing: '0.16em', fontWeight: 600 }}
            >
              {eyebrow}
            </Typography>
          )}
          <Typography variant="h5" sx={{ color: brand.text, fontWeight: 800, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: brand.textMuted, mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  );
};

export default SectionHeader;
