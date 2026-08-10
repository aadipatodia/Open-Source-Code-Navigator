import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LoginRounded } from "@mui/icons-material";
import { useNavigate, Navigate, Link as RouterLink } from "react-router-dom";

import { brand, brandGradient } from "../../theme/theme";
import { useAuth } from "../../context/AuthContext";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, googleLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const isEmailLikelyValid = useMemo(() => email.trim().includes("@"), [email]);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setError("");
    setGoogleSubmitting(true);
    try {
      await googleLogin();
      navigate("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
      setError(msg);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 520,
          p: { xs: 3, md: 4 },
          borderRadius: 4,
        }}
      >
        <Stack spacing={2.25}>
          <Box sx={{ textAlign: "center" }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2.5,
                display: "grid",
                placeItems: "center",
                background: brandGradient,
                color: "#fff",
                mb: 2,
                mx: "auto",
              }}
            >
              <LoginRounded sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: brand.text, mb: 0.5 }}>
              Welcome back
            </Typography>
            <Typography variant="body2" sx={{ color: brand.textMuted }}>
              Sign in with your email to continue.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ borderColor: brand.error }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                autoComplete="email"
              />
              <TextField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                type="password"
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="contained"
                disabled={submitting || !isEmailLikelyValid || !password}
                fullWidth
                sx={{ mt: 1 }}
              >
                {submitting ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Sign in"}
              </Button>
            </Stack>
          </Box>

          <Button
            type="button"
            variant="outlined"
            onClick={onGoogle}
            disabled={googleSubmitting}
            fullWidth
            sx={{ mt: 1 }}
          >
            {googleSubmitting ? (
              <CircularProgress size={22} sx={{ color: brand.primary }} />
            ) : (
              "Sign in with Google"
            )}
          </Button>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "center", pt: 0.5 }}
          >
            <Typography variant="body2" sx={{ color: brand.textMuted }}>
              Don&apos;t have an account?
            </Typography>
            <Button component={RouterLink} to="/signup" variant="text">
              Sign up
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default LoginPage;

