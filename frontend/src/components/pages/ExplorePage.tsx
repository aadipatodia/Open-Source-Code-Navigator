import React from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Stack,
  Chip,
  Button,
} from '@mui/material';
import {
  AccountTreeRounded,
  LaunchRounded,
  GitHub,
  RefreshRounded,
  FolderSpecialRounded,
  AutoAwesomeRounded,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

import { brand } from '../../theme/theme';
import { useAppData } from '../../context/AppDataContext';
import { FileItem } from '../../types';
import RepositoryInput from '../RepositoryInput';
import FileExplorer from '../FileExplorer';
import CodebaseAnalysis from '../CodebaseAnalysis';
import SectionHeader from '../common/SectionHeader';
import IconTile from '../common/IconTile';

const ExplorePage: React.FC = () => {
  const {
    repoUrl,
    repoStructure,
    repoLoading,
    repoError,
    selectedFile,
    fileContent,
    fileLoading,
    loadRepository,
    selectFile,
    openGuideForRepo,
    guideLoading,
  } = useAppData();

  const repoLabel = repoUrl
    ? repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SectionHeader
        icon={<AccountTreeRounded />}
        eyebrow="REPOSITORY EXPLORER"
        title="Open any GitHub project"
        subtitle="Paste a URL — we'll clone it temporarily and let you browse the file tree side-by-side with the code."
      />

      <RepositoryInput
        onRepositorySelect={loadRepository}
        loading={repoLoading}
        error={repoError}
        defaultValue={repoUrl}
      />

      {repoLoading && !repoStructure && (
        <Paper
          sx={{
            p: 5,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography sx={{ color: brand.textMuted }}>
            Cloning and indexing the repository… this can take a few seconds.
          </Typography>
        </Paper>
      )}

      {repoStructure && (
        <>
          <Paper
            sx={{
              p: 2,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
              background: `linear-gradient(135deg, ${alpha(brand.primary, 0.1)} 0%, ${alpha(brand.secondary, 0.05)} 100%)`,
            }}
          >
            <IconTile color={brand.primary} size={36} tint={0.18}>
              <GitHub />
            </IconTile>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: brand.textSubtle, letterSpacing: '0.12em' }}>
                CURRENTLY VIEWING
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: brand.text, fontWeight: 700, lineHeight: 1.2 }}
                noWrap
              >
                {repoLabel}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="small"
                onClick={() => repoUrl && openGuideForRepo(repoUrl)}
                startIcon={<AutoAwesomeRounded />}
                disabled={guideLoading}
              >
                How to Contribute
              </Button>
              <Button
                variant="outlined"
                size="small"
                href={repoUrl || '#'}
                target="_blank"
                rel="noreferrer"
                startIcon={<LaunchRounded />}
              >
                Open on GitHub
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => repoUrl && loadRepository(repoUrl)}
                startIcon={<RefreshRounded />}
                disabled={repoLoading}
              >
                Re-index
              </Button>
            </Stack>
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
              gap: 2,
              height: { md: 'calc(100vh - 320px)' },
              minHeight: 480,
            }}
          >
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <FolderSpecialRounded sx={{ color: brand.secondary }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: brand.text }}>
                  Files
                </Typography>
                <Chip size="small" label={`${countFiles(repoStructure)} files`} sx={{ ml: 'auto' }} />
              </Stack>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <FileExplorer
                  structure={repoStructure}
                  onFileSelect={selectFile}
                  selectedFile={selectedFile}
                />
              </Box>
            </Paper>

            <Paper
              sx={{
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                background: brand.surface,
              }}
            >
              {fileLoading ? (
                <Box
                  sx={{
                    flex: 1,
                    display: 'grid',
                    placeItems: 'center',
                    color: brand.textMuted,
                    gap: 1.5,
                  }}
                >
                  <CircularProgress />
                  <Typography variant="body2">Loading file…</Typography>
                </Box>
              ) : selectedFile ? (
                <CodebaseAnalysis
                  content={fileContent}
                  language={selectedFile.name.split('.').pop() || 'plaintext'}
                  fileName={selectedFile.name}
                  filePath={selectedFile.path}
                />
              ) : (
                <EmptyViewer />
              )}
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
};

const EmptyViewer: React.FC = () => (
  <Box
    sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: brand.textMuted,
      px: 4,
      gap: 1.5,
    }}
  >
    <IconTile color={brand.primary} size={72} tint={0.12} circular>
      <AccountTreeRounded sx={{ fontSize: 36 }} />
    </IconTile>
    <Typography variant="h6" sx={{ color: brand.text, fontWeight: 700 }}>
      Pick a file to read
    </Typography>
    <Typography variant="body2" sx={{ maxWidth: 360 }}>
      Use the file tree on the left to open a file. Search inside the tree to jump quickly.
    </Typography>
  </Box>
);

function countFiles(items: FileItem[]): number {
  return items.reduce(
    (total, item) => total + (item.type === 'directory' ? countFiles(item.children || []) : 1),
    0
  );
}

export default ExplorePage;
