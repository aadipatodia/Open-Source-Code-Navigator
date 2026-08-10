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
import { PersonAddRounded } from "@mui/icons-material";
import { Navigate, Link as RouterLink, useNavigate } from "react-router-dom";

import { brand, brandGradient } from "../../theme/theme";
import { useAuth } from "../../context/AuthContext";

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const isEmailLikelyValid = useMemo(() => email.trim().includes("@"), [email]);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(email.trim(), password);
      navigate("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign up failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
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
              <PersonAddRounded sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: brand.text, mb: 0.5 }}>
              Create your account
            </Typography>
            <Typography variant="body2" sx={{ color: brand.textMuted }}>
              Enter your email and choose a password.
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
                autoComplete="new-password"
                helperText="Use at least 6 characters (Firebase default minimum)."
              />

              <Button
                type="submit"
                variant="contained"
                disabled={submitting || !isEmailLikelyValid || !password}
                fullWidth
                sx={{ mt: 1 }}
              >
                {submitting ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Create account"}
              </Button>
            </Stack>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "center", pt: 0.5 }}
          >
            <Typography variant="body2" sx={{ color: brand.textMuted }}>
              Already have an account?
            </Typography>
            <Button component={RouterLink} to="/login" variant="text">
              Sign in
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default SignupPage;

