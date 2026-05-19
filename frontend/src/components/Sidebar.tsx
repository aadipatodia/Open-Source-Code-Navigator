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
  Tooltip,
} from '@mui/material';
import {
  HomeRounded,
  AccountTreeRounded,
  TravelExploreRounded,
  BiotechRounded,
  ChatBubbleRounded,
  AutoAwesomeRounded,
  LaunchRounded,
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { brand, brandGradient } from '../theme/theme';

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
  { to: '/chat', label: 'AI Chat', icon: <ChatBubbleRounded />, description: 'Ask anything' },
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

      {/* Footer card */}
      <Box sx={{ p: 1.5 }}>
        <Box
          sx={{
            p: 1.75,
            borderRadius: 14,
            border: `1px solid ${brand.border}`,
            background:
              `linear-gradient(135deg, ${alpha(brand.primary, 0.14)} 0%, ${alpha(brand.secondary, 0.08)} 100%)`,
          }}
        >
          <Typography variant="caption" sx={{ color: brand.secondary, fontWeight: 600 }}>
            POWERED BY
          </Typography>
          <Typography variant="body2" sx={{ color: brand.text, fontWeight: 700, mt: 0.25 }}>
            Gemini 2.5 Flash
          </Typography>
          <Tooltip title="Open Google AI Studio" arrow>
            <Box
              component="a"
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noreferrer"
              sx={{
                mt: 0.75,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: brand.textMuted,
                fontSize: '0.75rem',
                textDecoration: 'none',
                '&:hover': { color: brand.text },
              }}
            >
              aistudio.google.com <LaunchRounded sx={{ fontSize: 14 }} />
            </Box>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  if (variant === 'permanent') {
    return (
      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            border: 0,
            background: 'transparent',
          },
        }}
        open
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          border: 0,
          background: 'transparent',
        },
      }}
    >
      {content}
    </Drawer>
  );
};

export default Sidebar;
