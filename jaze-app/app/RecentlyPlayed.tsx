"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Stack,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { usePlayer, type TrackInfo } from "./PlayerProvider";

type RecentTrack = TrackInfo & { playCount?: number };

type PlaysResponse = {
  recent: RecentTrack[];
  resume: { positionSeconds: number; track: RecentTrack } | null;
};

/**
 * Section « Écouté récemment » + bandeau de reprise de lecture.
 * Ne s'affiche que si l'utilisateur connecté a un historique.
 */
export function RecentlyPlayed() {
  const { playTrackList, seek } = usePlayer();
  const [data, setData] = useState<PlaysResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/plays", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active) setData(json);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!data || data.recent.length === 0) return null;

  const resume = data.resume;

  return (
    <Box sx={{ mb: 4 }}>
      {resume && (
        <Card sx={{ mb: 2, p: 2, bgcolor: "action.hover" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Reprendre où vous vous êtes arrêté
              </Typography>
              <Typography variant="subtitle1" noWrap>
                {resume.track.title} — {resume.track.albumTitle}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => {
                playTrackList([resume.track], 0);
                // Laisse le temps à la piste de se charger avant le seek.
                setTimeout(() => seek(resume.positionSeconds), 400);
              }}
            >
              Reprendre
            </Button>
          </Stack>
        </Card>
      )}

      <Typography variant="h6" gutterBottom>
        Écouté récemment
      </Typography>
      <Stack direction="row" spacing={2} sx={{ overflowX: "auto", pb: 1 }}>
        {data.recent.map((track) => (
          <Card key={track.id} sx={{ minWidth: 160, flexShrink: 0 }}>
            <CardActionArea
              onClick={() => playTrackList(data.recent, data.recent.indexOf(track))}
              sx={{ p: 1.5 }}
            >
              <Typography variant="body2" fontWeight={600} noWrap>
                {track.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {track.albumTitle}
              </Typography>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
