import React from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface IconTileProps {
  children: React.ReactNode;
  /** Accent colour used for both the icon and its translucent backing. */
  color: string;
  size?: number;
  circular?: boolean;
  tint?: number;
}

/** The rounded, tinted badge that sits beside most headings in the app. */
const IconTile: React.FC<IconTileProps> = ({
  children,
  color,
  size = 40,
  circular = false,
  tint = 0.16,
}) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: circular ? '50%' : 2,
      display: 'grid',
      placeItems: 'center',
      background: alpha(color, tint),
      color,
      flexShrink: 0,
    }}
  >
    {children}
  </Box>
);

export default IconTile;
