import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Avatar,
} from '@mui/material';
import { MenuRounded } from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { brand } from '../theme/theme';
import { User } from '../types';

interface TopBarProps {
  user: User;
  onOpenSidebar: () => void;
  showMenuButton: boolean;
}

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Welcome back',
    subtitle: 'Pick up where you left off, or kick off a new exploration.',
  },
  '/explore': {
    title: 'Explore a repository',
    subtitle: 'Clone, browse, and read any public GitHub project.',
  },
  '/issues': {
    title: 'Find your next contribution',
    subtitle: 'Search beginner-friendly issues that match your skills.',
  },
  '/analyze': {
    title: 'Analyze a code snippet',
    subtitle: 'Get an explanation and a security review in seconds.',
  },
  '/chat': {
    title: 'Ask the AI anything',
    subtitle: 'Your pair-programmer is one message away.',
  },
};

const TopBar: React.FC<TopBarProps> = ({ user, onOpenSidebar, showMenuButton }) => {
  const location = useLocation();

  const { title, subtitle } =
    TITLES[location.pathname] ||
    Object.entries(TITLES).find(
      ([prefix]) => prefix !== '/' && location.pathname.startsWith(prefix)
    )?.[1] ||
    TITLES['/'];

  const initial = (user.name || 'C').trim().charAt(0).toUpperCase();

  return (
    <AppBar position="sticky">
      <Toolbar sx={{ py: 1.25, gap: 1.5 }}>
        {showMenuButton && (
          <IconButton onClick={onOpenSidebar} sx={{ mr: 0.5 }}>
            <MenuRounded />
          </IconButton>
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: brand.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: brand.textMuted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        <Avatar
          sx={{
            width: 38,
            height: 38,
            background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`,
            color: '#fff',
            fontWeight: 700,
            border: `1px solid ${brand.border}`,
          }}
        >
          {initial}
        </Avatar>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
