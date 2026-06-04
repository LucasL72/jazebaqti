"use client";

import { useState } from "react";
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import CloseIcon from "@mui/icons-material/Close";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { usePlayer } from "./PlayerProvider";

/**
 * Bouton + tiroir affichant la file d'attente courante, avec réordonnancement
 * (monter / descendre) et suppression. Lecture directe au clic sur un titre.
 */
export function QueuePanel() {
  const [open, setOpen] = useState(false);
  const { queue, currentIndex, playAt, removeFromQueue, reorderQueue } = usePlayer();

  return (
    <>
      <Tooltip title="File d'attente" arrow>
        <span>
          <IconButton
            onClick={() => setOpen(true)}
            size="small"
            aria-label="Ouvrir la file d'attente"
            disabled={queue.length === 0}
          >
            <QueueMusicIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: { xs: 300, sm: 360 }, p: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={1}
          >
            <Typography variant="h6">File d&apos;attente</Typography>
            <IconButton onClick={() => setOpen(false)} aria-label="Fermer">
              <CloseIcon />
            </IconButton>
          </Stack>

          {queue.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aucune piste en file.
            </Typography>
          ) : (
            <List dense disablePadding>
              {queue.map((track, index) => {
                const isCurrent = index === currentIndex;
                return (
                  <ListItem
                    key={`${track.id}-${index}`}
                    disablePadding
                    secondaryAction={
                      <Stack direction="row" spacing={0}>
                        <IconButton
                          size="small"
                          aria-label="Monter"
                          disabled={index === 0}
                          onClick={() => reorderQueue(index, index - 1)}
                        >
                          <ArrowUpwardIcon fontSize="inherit" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label="Descendre"
                          disabled={index === queue.length - 1}
                          onClick={() => reorderQueue(index, index + 1)}
                        >
                          <ArrowDownwardIcon fontSize="inherit" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label="Retirer de la file"
                          disabled={isCurrent}
                          onClick={() => removeFromQueue(index)}
                        >
                          <DeleteOutlineIcon fontSize="inherit" />
                        </IconButton>
                      </Stack>
                    }
                  >
                    <ListItemButton
                      selected={isCurrent}
                      onClick={() => playAt(index)}
                      sx={{ pr: 12 }}
                    >
                      <ListItemText
                        primary={`${track.trackNumber}. ${track.title}`}
                        secondary={track.albumTitle}
                        primaryTypographyProps={{
                          noWrap: true,
                          fontWeight: isCurrent ? 700 : 400,
                        }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </Drawer>
    </>
  );
}
