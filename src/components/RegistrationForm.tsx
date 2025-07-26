import React, { useState, useEffect } from "react";
import { saveCredentials, createUserWithProfile, getUserByUsername } from "../firebase/firestoreHelpers"; // Assuming this path is correct
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  Alert,
  Fade,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
  Snackbar,
  Link,
  IconButton,
  createTheme, // Import createTheme
  ThemeProvider, // Import ThemeProvider
  CssBaseline, // Import CssBaseline
} from "@mui/material";
import {
  AccountCircle,
  Lock,
  HowToReg,
  AdminPanelSettings,
  PointOfSale,
  Person,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import logo from '../assets/logos/carwash-logo.png'; // Assuming this path is correct
import { motion } from "framer-motion"; // No need for @ts-ignore if framer-motion is installed correctly
import { useNavigate } from "react-router-dom";

// Custom Material-UI Theme for consistent styling (copied from LoginForm for consistency)
const theme = createTheme({
  typography: {
    fontFamily: '"Inter", sans-serif', // Using Inter as requested
    h4: {
      fontFamily: '"Poppins", sans-serif', // Keep Poppins for headings for distinct branding
      fontWeight: 800,
      letterSpacing: 1.5,
    },
    h5: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 700,
      letterSpacing: 1.2,
    },
    h6: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none', // Keep button text as is
    },
  },
  palette: {
    primary: {
      main: '#ef5350', // Brighter red
      light: '#ff8a80',
      dark: '#d32f2f',
    },
    secondary: {
      main: '#424242', // Dark grey for contrast
    },
    background: {
      default: '#f0f2f5', // Light background
      paper: 'rgba(255,255,255,0.95)', // Slightly more opaque for glass effect
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '16px', // More rounded corners for text fields
            backgroundColor: 'rgba(255,255,255,0.8)', // Slightly transparent background
            '& fieldset': {
              borderColor: '#e0e0e0',
              transition: 'border-color 0.3s ease-in-out',
            },
            '&:hover fieldset': {
              borderColor: '#ffab91',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ef5350',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#666',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#ef5350',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '16px', // More rounded corners for buttons
          padding: '12px 24px',
          fontWeight: 700,
          letterSpacing: 0.8,
          boxShadow: '0 6px 20px rgba(0,0,0,0.1)', // Enhanced shadow
          transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)', // Smooth transition for hover
          '&:hover': {
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)', // More pronounced shadow on hover
            transform: 'translateY(-2px)', // Subtle lift effect
            outline: 'none', // Remove outline on hover
            border: 'none', // Ensure no border on hover
          },
          '&:focus': { // Also remove outline on focus for accessibility (keyboard navigation)
            outline: 'none',
            border: 'none', // Ensure no border on focus
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '24px', // Even more rounded for the main card
          backdropFilter: 'blur(20px)', // Increased blur for glass effect
          border: '1px solid rgba(255,255,255,0.4)', // More visible border for glass effect
          boxShadow: '0 20px 60px 0 rgba(0,0,0,0.15), 0 5px 15px 0 rgba(0,0,0,0.05)', // Deeper, softer shadow
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '12px', // Rounded corners for alerts
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: '16px', // Apply rounded corners to Select
          backgroundColor: 'rgba(255,255,255,0.8)', // Consistent background
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e0e0e0',
            transition: 'border-color 0.3s ease-in-out',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ffab91',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ef5350',
            borderWidth: '2px',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#666',
          '&.Mui-focused': {
            color: '#ef5350',
          },
        },
      },
    },
  },
});

// Array of high-quality car images for the right side (same as LoginForm)
const carImages = [
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
];

interface RegistrationFormProps {
  onBackToLogin?: () => void; // Keeping this if needed for a parent component, though navigate is used directly
}

const RegistrationForm: React.FC<RegistrationFormProps> = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("cashier");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPasswords, setShowPasswords] = useState(false); // single toggle for both fields

  // Use Material-UI breakpoints for responsive design
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  // Effect to cycle through background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carImages.length);
    }, 6000); // Change image every 6 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage(""); // Clear previous messages

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSnackbarOpen(true);
      setLoading(false);
      return;
    }

    try {
      // Check if username already exists
      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        setError("Username already exists. Please choose another.");
        setSnackbarOpen(true);
        setLoading(false);
        return;
      }

      // Set status to pending on registration
      await createUserWithProfile({
        username,
        password,
        role,
        firstName,
        lastName,
        status: "pending", // New accounts are pending by default
      });

      setMessage("Account created successfully! Please wait for admin approval.");
      // Clear form fields after successful registration
      setFirstName("");
      setLastName("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setRole("cashier"); // Reset role to default
    } catch (err) {
      console.error("Registration failed:", err);
      setError("Registration failed. Please try again.");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => setSnackbarOpen(false);

  // Stepper logic for UX (visual only)
  const step =
    firstName && lastName && username && password && confirmPassword
      ? 3
      : firstName && lastName && username && password
      ? 2
      : firstName && lastName && username
      ? 1
      : 0;

  // Framer Motion variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Delay children animations
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  return (
    <ThemeProvider theme={theme}> {/* Apply the custom theme */}
      <CssBaseline /> {/* Apply base CSS for consistent styling */}
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          position: "relative",
          background: "linear-gradient(135deg, #f0f2f5 0%, #e0e0e0 100%)", // Consistent gradient
          overflow: "hidden",
          fontFamily: theme.typography.fontFamily, // Ensure font family is applied
        }}
      >
        {/* Decorative background shapes with animations (consistent with LoginForm) */}
        <Box
          sx={{
            position: "absolute",
            top: -150,
            left: -150,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 60% 40%, rgba(255, 138, 128, 0.3) 0%, rgba(255, 240, 240, 0) 80%)", // Lighter, more subtle red
            zIndex: 0,
            filter: "blur(25px)", // Increased blur for a dreamy effect
            animation: 'float1 10s ease-in-out infinite alternate', // Floating animation
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -120,
            right: -120,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 40% 60%, rgba(255, 138, 128, 0.3) 0%, rgba(255, 240, 240, 0) 80%)", // Lighter, more subtle red
            zIndex: 0,
            filter: "blur(20px)", // Increased blur
            animation: 'float2 12s ease-in-out infinite alternate-reverse', // Floating animation
          }}
        />
        {/* Keyframe animations for floating shapes */}
        <style>
          {`
          @keyframes float1 {
            0% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(20px, 10px) rotate(5deg); }
            100% { transform: translate(0, 0) rotate(0deg); }
          }
          @keyframes float2 {
            0% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(-15px, -10px) rotate(-3deg); }
            100% { transform: translate(0, 0) rotate(0deg); }
          }
          `}
        </style>

        {/* Left side - Registration Form */}
        <Box
          sx={{
            width: isMobile ? "100%" : "50%",
            minHeight: isMobile ? "auto" : "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            px: isXs ? 2 : isMobile ? 4 : 8,
            py: isXs ? 4 : isMobile ? 6 : 0,
            position: "relative",
            zIndex: 2,
            background: isMobile ? "rgba(255,255,255,0.95)" : "transparent",
          }}
        >
          {/* Vertical accent bar for desktop */}
          {!isMobile && (
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: "10%",
                height: "80%",
                width: 8, // Consistent with login form
                borderRadius: 4,
                background: "linear-gradient(180deg, #ef5350 0%, #ffab91 100%)", // Consistent gradient
                boxShadow: "0 0 20px 5px rgba(239,83,80,0.3)", // Consistent shadow
                zIndex: 3,
              }}
            />
          )}

          {/* Branding with animations */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <motion.div variants={itemVariants}>
              <Box
                component="img"
                src={logo}
                alt="MAD Auto Care Services"
                sx={{
                  height: isXs ? 64 : isMobile ? 80 : 100, // Consistent logo size
                  mb: 2.5,
                  filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.15))", // Consistent shadow
                  borderRadius: 3, // Consistent border radius
                  background: "#fff",
                  p: 2, // Consistent padding
                }}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Typography
                variant={isXs ? "h5" : "h4"}
                sx={{
                  fontWeight: 800,
                  letterSpacing: 1.5, // Consistent letter spacing
                  color: theme.palette.primary.main, // Consistent theme color
                  mb: 1,
                  textShadow: "0 3px 10px rgba(0,0,0,0.08)", // Consistent text shadow
                }}
              >
                MAD AUTO CARE SERVICES
              </Typography>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: theme.palette.text.secondary, // Consistent theme color
                  mb: 4, // Increased bottom margin
                  fontWeight: 500,
                  fontSize: isXs ? "1rem" : "1.1rem", // Consistent font size
                }}
              >
                Premium Car Care Solutions
              </Typography>
            </motion.div>
          </motion.div>

          {/* Glassmorphism Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            style={{ width: "100%", maxWidth: 400 }} // Consistent max width
          >
            <Paper
              elevation={0}
              sx={{
                width: "100%",
                p: isXs ? 3 : 4, // Consistent padding
                borderRadius: 3, // Consistent border radius
                background: theme.palette.background.paper, // Consistent transparent background
                backdropFilter: 'blur(20px)', // Consistent blur
                boxShadow: '0 20px 60px 0 rgba(0,0,0,0.15), 0 5px 15px 0 rgba(0,0,0,0.05)', // Consistent shadow
                border: '1px solid rgba(255,255,255,0.4)', // Consistent border
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Stepper indicator */}
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}> {/* Increased margin bottom */}
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 32, // Consistent width
                      height: 8, // Consistent height
                      borderRadius: 3, // Consistent border radius
                      mx: 0.8,
                      background:
                        step > i
                          ? "linear-gradient(90deg, #ef5350 0%, #ffab91 100%)" // Consistent gradient
                          : "#e0e0e0", // Consistent inactive color
                      transition: "background 0.4s ease-in-out", // Consistent transition
                    }}
                  />
                ))}
              </Box>

              <Typography
                variant="h6"
                component="h1"
                sx={{
                  mb: 3, // Increased margin bottom
                  textAlign: "center",
                  fontWeight: 700,
                  color: theme.palette.secondary.main, // Consistent text color
                  fontFamily: theme.typography.h6.fontFamily, // Consistent font family
                  fontSize: isXs ? "1.2rem" : "1.35rem", // Consistent font size
                }}
              >
                Create your account
              </Typography>

              <form onSubmit={handleRegister} autoComplete="off">
                {/* First Name Input */}
                <motion.div variants={itemVariants}>
                  <TextField
                    fullWidth
                    label="First Name"
                    variant="outlined"
                    margin="normal"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2.5 }} // Consistent margin bottom
                    required
                    autoFocus
                    size="medium"
                  />
                </motion.div>

                {/* Last Name Input */}
                <motion.div variants={itemVariants}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    variant="outlined"
                    margin="normal"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2.5 }} // Consistent margin bottom
                    required
                    size="medium"
                  />
                </motion.div>

                {/* Username Input */}
                <motion.div variants={itemVariants}>
                  <TextField
                    fullWidth
                    label="Username"
                    variant="outlined"
                    margin="normal"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircle color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2.5 }} // Consistent margin bottom
                    required
                    size="medium"
                  />
                </motion.div>

                {/* Password Input */}
                <motion.div variants={itemVariants}>
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPasswords ? "text" : "password"}
                    variant="outlined"
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPasswords((v: boolean) => !v)}
                            edge="end"
                            size="small"
                            tabIndex={-1}
                          >
                            {showPasswords ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2.5 }} // Consistent margin bottom
                    required
                    size="medium"
                  />
                </motion.div>

                {/* Confirm Password Input */}
                <motion.div variants={itemVariants}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={showPasswords ? "text" : "password"}
                    variant="outlined"
                    margin="normal"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPasswords((v: boolean) => !v)}
                            edge="end"
                            size="small"
                            tabIndex={-1}
                          >
                            {showPasswords ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2.5 }} // Consistent margin bottom
                    required
                    size="medium"
                  />
                </motion.div>

                {/* Role Select */}
                <motion.div variants={itemVariants}>
                  <FormControl fullWidth sx={{ mb: 3 }}> {/* Increased margin bottom */}
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={role}
                      onChange={(e) => setRole(e.target.value as string)}
                      label="Role"
                      required
                      size="medium" // Consistent size
                    >
                      <MenuItem value="cashier">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PointOfSale fontSize="small" /> Cashier
                        </Box>
                      </MenuItem>
                      <MenuItem value="admin">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <AdminPanelSettings fontSize="small" /> Admin
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </motion.div>

                {/* Create Account Button with hover/tap animations */}
                <motion.div
                  whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.2)" }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    type="submit"
                    disabled={loading}
                    startIcon={
                      loading ? <CircularProgress size={20} color="inherit" /> : <HowToReg />
                    }
                    sx={{
                      mt: 1.5, // Consistent margin top
                      py: 1.5, // Consistent padding
                      borderRadius: 3, // Consistent border radius
                      fontSize: "1.1rem", // Consistent font size
                      background: theme.palette.primary.main, // Consistent theme color
                      '&:hover': {
                        background: theme.palette.primary.dark, // Consistent darker hover state
                        outline: 'none', // Ensure no outline on hover
                        border: 'none', // Explicitly remove border on hover
                      },
                      '&:focus': { // Ensure no outline on focus (for keyboard navigation)
                        outline: 'none',
                        border: 'none', // Explicitly remove border on focus
                      },
                      boxShadow: '0 6px 20px rgba(0,0,0,0.15)', // Consistent initial shadow
                    }}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </motion.div>
              </form>

              {/* Back to Login Link */}
              <Box sx={{ mt: 3, textAlign: "center" }}> {/* Consistent margin top */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: "0.95rem" }} // Consistent font size
                >
                  Already have an account?{" "}
                  <Link
                    component="button"
                    onClick={() => navigate("/login")}
                    sx={{
                      fontWeight: 700, // Consistent font weight
                      cursor: "pointer",
                      color: theme.palette.primary.main, // Consistent theme color
                      "&:hover": {
                        textDecoration: "underline",
                      },
                      transition: 'color 0.2s ease-in-out', // Consistent transition
                    }}
                  >
                    Back to Login
                  </Link>
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </Box>

        {/* Right side - Car Images Carousel with overlay (Desktop Only) */}
        {!isMobile && (
          <Box
            sx={{
              width: "50%",
              minHeight: "100vh",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Carousel images with smooth transitions */}
            {carImages.map((img, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{
                  opacity: index === currentImageIndex ? 1 : 0,
                  scale: index === currentImageIndex ? 1 : 1.05,
                  transition: { duration: 1.5, ease: "easeInOut" },
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundImage: `url(${img})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  zIndex: 1,
                }}
              />
            ))}
            {/* Overlay gradient */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background:
                  "linear-gradient(120deg, rgba(0,0,0,0.65) 30%, rgba(239,83,80,0.35) 100%)", // Consistent gradient
                zIndex: 2,
              }}
            />
            {/* Branding overlay */}
            <Box
              sx={{
                position: "absolute",
                bottom: 64, // Consistent bottom margin
                left: 64, // Consistent left margin
                zIndex: 3,
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    mb: 1.5, // Consistent margin bottom
                    letterSpacing: 1.5, // Consistent letter spacing
                    textShadow: "0 4px 16px rgba(0,0,0,0.8)", // Consistent shadow
                  }}
                >
                  MAD AUTO CARE SERVICES
                </Typography>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 500, textShadow: "0 2px 10px rgba(0,0,0,0.6)" }} // Consistent shadow
                >
                  Premium Car Care Solutions
                </Typography>
              </motion.div>
            </Box>
            {/* Carousel dots */}
            <Box
              sx={{
                position: "absolute",
                bottom: 40, // Consistent bottom margin
                left: 64, // Consistent left margin
                zIndex: 4,
                display: "flex",
                gap: 1.5, // Consistent gap
              }}
            >
              {carImages.map((_, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.2, backgroundColor: "#fff" }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Box
                    sx={{
                      width: 16, // Consistent width
                      height: 16, // Consistent height
                      borderRadius: "50%",
                      background: idx === currentImageIndex ? "#fff" : "rgba(255,255,255,0.6)",
                      border:
                        idx === currentImageIndex
                          ? "3px solid #ef5350" // Consistent border
                          : "2px solid rgba(255,255,255,0.4)",
                      transition: "all 0.3s ease-in-out", // Consistent transition
                      cursor: "pointer",
                    }}
                    onClick={() => setCurrentImageIndex(idx)}
                  />
                </motion.div>
              ))}
            </Box>
          </Box>
        )}

        {/* Snackbar for errors */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={5000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          sx={{ mt: { xs: 2, sm: 8 } }}
        >
          <motion.div
            initial={{ opacity: 0, y: -50 }} // Consistent animation
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Alert
              severity="error"
              onClose={handleCloseSnackbar}
              sx={{
                width: "100%",
                borderRadius: 2,
                boxShadow: 3,
                backgroundColor: theme.palette.background.paper, // Consistent background
                color: theme.palette.error.main, // Consistent color
                "& .MuiAlert-icon": {
                  color: theme.palette.error.main,
                },
              }}
            >
              {error}
            </Alert>
          </motion.div>
        </Snackbar>

        {/* Snackbar for success messages */}
        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          sx={{ mt: { xs: 2, sm: 8 } }}
        >
          <motion.div
            initial={{ opacity: 0, y: -50 }} // Consistent animation
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Alert
              severity="success"
              onClose={() => setMessage("")}
              sx={{
                width: "100%",
                borderRadius: 2,
                boxShadow: 3,
                backgroundColor: theme.palette.background.paper, // Consistent background
                color: theme.palette.success.main, // Use theme success color
                "& .MuiAlert-icon": {
                  color: theme.palette.success.main,
                },
              }}
            >
              {message}
            </Alert>
          </motion.div>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default RegistrationForm;
