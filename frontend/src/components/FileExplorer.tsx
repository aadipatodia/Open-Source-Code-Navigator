import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  ExpandMore,
  ChevronRight,
} from '@mui/icons-material';

// Define the FileItem interface
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

const FileItemComponent: React.FC<{ item: FileItem; level: number; onFileSelect: (file: FileItem) => void; selectedFile: FileItem | null; }> = ({
  item,
  level = 0,
  onFileSelect,
  selectedFile,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDirectory = item.type === 'directory';
  const isSelected = selectedFile && selectedFile.path === item.path;

  const handleClick = () => {
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(item);
    }
  };

  return (
    <>
      <ListItem
        onClick={handleClick}
        sx={{
          pl: level * 2 + 2,
          backgroundColor: isSelected ? 'rgba(168, 255, 0, 0.1)' : 'transparent',
          borderRadius: '4px',
          '&:hover': { backgroundColor: 'rgba(168, 255, 0, 0.05)' },
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        <ListItemIcon sx={{ minWidth: '32px' }}>
          {isDirectory ? (
            <IconButton onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} size="small">
              {isOpen ? <ExpandMore /> : <ChevronRight />}
            </IconButton>
          ) : null}
        </ListItemIcon>
        <ListItemIcon sx={{ minWidth: '32px', color: isSelected ? '#a8ff00' : 'inherit' }}>
          {isDirectory ? (isOpen ? <FolderOpenIcon /> : <FolderIcon />) : <FileIcon />}
        </ListItemIcon>
        <ListItemText
          primary={item.name}
          sx={{
            '& .MuiListItemText-primary': {
              fontSize: '0.9rem',
              color: isSelected ? '#a8ff00' : '#e0e0e0',
            },
          }}
        />
      </ListItem>
      {isDirectory && isOpen && item.children && (
        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child) => (
              <FileItemComponent
                key={child.path}
                item={child}
                level={level + 1}
                onFileSelect={onFileSelect}
                selectedFile={selectedFile}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ structure, onFileSelect, selectedFile }) => {
  if (!structure) return <Typography sx={{ color: '#a8ff00' }}>No repository structure available</Typography>;

  return (
    <List component="nav" disablePadding sx={{ bgcolor: '#1e1e2f', borderRadius: '4px', p: 1 }}>
      {structure.map((item) => (
        <FileItemComponent
          key={item.path}
          item={item}
          level={0}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
        />
      ))}
    </List>
  );
};

export default FileExplorer;