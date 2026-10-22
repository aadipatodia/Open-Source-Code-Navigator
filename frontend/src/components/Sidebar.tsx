// Sidebar navigation drawer — permanent on large screens, temporary on mobile.
import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import {
  HomeRounded,
  AccountTreeRounded,
  TravelExploreRounded,
  BiotechRounded,
  ChatBubbleRounded,
  AutoAwesomeRounded,
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { brand, brandGradient } from '../theme';

export const SIDEBAR_WIDTH = 248;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant: 'temporary' | 'permanent';
}

const navItems = [
  { to: '/', label: 'Home', icon: <HomeRounded />, description: 'Overview & quick actions' },
  { to: '/explore', label: 'Explore Repo', icon: <AccountTreeRounded />, description: 'Browse & read code' },
  { to: '/issues', label: 'Find Issues', icon: <TravelExploreRounded />, description: 'Beginner-friendly tasks' },
  { to: '/analyze', label: 'Analyze Code', icon: <BiotechRounded />, description: 'Explain & secure snippets' },
  { to: '/chat', label: 'AI Chat', icon: <ChatBubbleRounded />, description: 'Programming Q&A' },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, variant }) => {
  const location = useLocation();

  const content = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${alpha(brand.bg, 0.9)} 0%, ${alpha(brand.surfaceMuted, 0.95)} 100%)`,
        borderRight: `1px solid ${brand.border}`,
        backdropFilter: 'blur(14px)',
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              background: brandGradient,
              boxShadow: `0 8px 24px ${alpha(brand.primary, 0.45)}`,
            }}
          >
            <AutoAwesomeRounded sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                lineHeight: 1.05,
                background: brandGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Code Navigator
            </Typography>
            <Typography variant="caption" sx={{ color: brand.textSubtle }}>
              Open-source on-ramp
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: brand.border, opacity: 0.7 }} />

      {/* Nav items */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.25, py: 2 }}>
        <Typography
          variant="overline"
          sx={{ color: brand.textSubtle, letterSpacing: '0.14em', pl: 1.5 }}
        >
          Workspace
        </Typography>
        <List sx={{ mt: 0.5 }}>
          {navItems.map((item) => {
            const selected =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={NavLink}
                  to={item.to}
                  selected={selected}
                  onClick={variant === 'temporary' ? onClose : undefined}
                  sx={{
                    py: 1.2,
                    gap: 1,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: selected ? brand.primary : brand.textMuted,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    secondary={item.description}
                    primaryTypographyProps={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: selected ? brand.text : brand.text,
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.74rem',
                      color: brand.textSubtle,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={variant === 'permanent' ? true : open}
      onClose={onClose}
      ModalProps={variant === 'temporary' ? { keepMounted: true } : undefined}
      sx={{
        ...(variant === 'permanent' && { width: SIDEBAR_WIDTH, flexShrink: 0 }),
        '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, border: 0, background: 'transparent' },
      }}
    >
      {content}
    </Drawer>
  );
};

export default Sidebar;
