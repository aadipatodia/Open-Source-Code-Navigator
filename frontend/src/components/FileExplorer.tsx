import React, { useMemo, useState } from 'react';
import {
  Box,
  Collapse,
  TextField,
  InputAdornment,
  Typography,
} from '@mui/material';
import {
  FolderRounded,
  FolderOpenRounded,
  DescriptionRounded,
  ExpandMoreRounded,
  ChevronRightRounded,
  SearchRounded,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { brand } from '../theme/theme';

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  size?: number;
  children?: FileItem[];
}

interface FileExplorerProps {
  structure: FileItem[];
  onFileSelect: (file: FileItem) => void;
  selectedFile: FileItem | null;
}

// ---------------------------------------------------------------------------
// Helpers — filter the tree to items matching a query (keeping ancestors).
// ---------------------------------------------------------------------------
function filterTree(items: FileItem[], query: string): FileItem[] {
  if (!query) return items;
  const q = query.toLowerCase();
  const walk = (nodes: FileItem[]): FileItem[] => {
    const out: FileItem[] = [];
    for (const node of nodes) {
      if (node.type === 'directory') {
        const filteredChildren = walk(node.children || []);
        if (filteredChildren.length || node.name.toLowerCase().includes(q)) {
          out.push({ ...node, children: filteredChildren });
        }
      } else if (node.name.toLowerCase().includes(q)) {
        out.push(node);
      }
    }
    return out;
  };
  return walk(items);
}

// ---------------------------------------------------------------------------
// Tree node component
// ---------------------------------------------------------------------------
interface NodeProps {
  item: FileItem;
  level: number;
  onFileSelect: (file: FileItem) => void;
  selectedFile: FileItem | null;
  defaultOpen?: boolean;
  query: string;
}

const FileNode: React.FC<NodeProps> = ({
  item,
  level,
  onFileSelect,
  selectedFile,
  defaultOpen,
  query,
}) => {
  const isDirectory = item.type === 'directory';
  // Auto-expand on search or when defaultOpen is true (top-level).
  const [isOpen, setIsOpen] = useState(Boolean(defaultOpen || query));
  const isSelected = !!selectedFile && selectedFile.path === item.path;

  const effectiveOpen = isOpen || Boolean(query);

  const handleClick = () => {
    if (isDirectory) {
      setIsOpen((prev) => !prev);
    } else {
      onFileSelect(item);
    }
  };

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          py: 0.4,
          pr: 1,
          pl: `${level * 14 + 6}px`,
          borderRadius: 1.5,
          cursor: 'pointer',
          color: isSelected ? brand.text : brand.textMuted,
          background: isSelected ? alpha(brand.primary, 0.18) : 'transparent',
          border: isSelected
            ? `1px solid ${alpha(brand.primary, 0.5)}`
            : '1px solid transparent',
          transition: 'background 120ms ease, color 120ms ease',
          '&:hover': {
            background: isSelected
              ? alpha(brand.primary, 0.22)
              : alpha(brand.text, 0.05),
            color: brand.text,
          },
        }}
      >
        <Box sx={{ width: 18, display: 'grid', placeItems: 'center', color: brand.textSubtle }}>
          {isDirectory ? (
            effectiveOpen ? <ExpandMoreRounded fontSize="small" /> : <ChevronRightRounded fontSize="small" />
          ) : null}
        </Box>
        <Box sx={{ width: 18, display: 'grid', placeItems: 'center', color: isSelected ? brand.primary : brand.textSubtle }}>
          {isDirectory ? (
            effectiveOpen ? <FolderOpenRounded sx={{ fontSize: 18 }} /> : <FolderRounded sx={{ fontSize: 18 }} />
          ) : (
            <DescriptionRounded sx={{ fontSize: 18 }} />
          )}
        </Box>
        <Typography
          sx={{
            fontSize: '0.86rem',
            color: 'inherit',
            fontWeight: isSelected ? 600 : 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontFamily: isDirectory ? 'inherit' : '"JetBrains Mono", monospace',
          }}
        >
          {item.name}
        </Typography>
      </Box>

      {isDirectory && item.children && (
        <Collapse in={effectiveOpen} timeout="auto" unmountOnExit>
          {item.children.map((child) => (
            <FileNode
              key={child.path}
              item={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              query={query}
            />
          ))}
        </Collapse>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const FileExplorer: React.FC<FileExplorerProps> = ({ structure, onFileSelect, selectedFile }) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterTree(structure, query.trim()), [structure, query]);

  if (!structure || structure.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: brand.textMuted, p: 2 }}>
        No files to display.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TextField
        size="small"
        fullWidth
        placeholder="Filter files…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 1.5 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRounded sx={{ color: brand.textSubtle, fontSize: 18 }} />
            </InputAdornment>
          ),
        }}
      />
      <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
        {filtered.length === 0 ? (
          <Typography variant="body2" sx={{ color: brand.textMuted, p: 2 }}>
            No matches for "{query}".
          </Typography>
        ) : (
          filtered.map((item) => (
            <FileNode
              key={item.path}
              item={item}
              level={0}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              defaultOpen
              query={query.trim()}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default FileExplorer;
