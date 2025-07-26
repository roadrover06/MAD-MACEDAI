import React, { useState, useEffect } from "react";
import { getUserByUsername } from "../firebase/firestoreHelpers"; // Assuming this path is correct
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
  useMediaQuery,
  Snackbar,
  Link,
  IconButton,
  createTheme,
  ThemeProvider,
  CssBaseline,
} from "@mui/material";
import {
  AccountCircle,
  Lock,
  Login as LoginIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import logo from '../assets/logos/carwash-logo.png'; // Assuming this path is correct
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import bcrypt from "bcryptjs"; // NOTE: For production, password hashing/comparison should ideally happen on a secure backend server, not directly in the frontend for security reasons.
import { setLocal } from "../utils/offlineSync";

// Custom Material-UI Theme for consistent styling
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
  },
});

// Array of high-quality car images for the right side
const carImages = [
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
];

// Add UserDoc interface to match Firestore user document structure
interface UserDoc {
  id: string;
  username: string;
  password: string;
  role: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

interface LoginFormProps {
  onCreateAccount?: () => void; // Keeping this if needed for a parent component, though navigate is used directly
}

const LoginForm: React.FC<LoginFormProps> = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordAlertOpen, setForgotPasswordAlertOpen] = useState(false);

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

  // Redirect if already authenticated
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole === "admin") navigate("/admin");
    if (storedRole === "cashier") navigate("/cashier");
  }, [navigate]);

  // Handles the login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // Clear previous errors
    setMessage(""); // Clear previous success messages
    setForgotPasswordAlertOpen(false); // Ensure forgot password alert is closed on login attempt

    try {
      const userDocRaw = await getUserByUsername(username);
      if (!userDocRaw) {
        setError("Invalid username or password. Please try again.");
        setSnackbarOpen(true);
        return;
      }

      const userDoc = userDocRaw as UserDoc;

      // Handle account status checks
      if (userDoc.status === "pending") {
        setError(
          "Your account is still pending approval. Please wait for an administrator to activate your account."
        );
        setSnackbarOpen(true);
        return;
      }
      if (userDoc.status === "disabled") {
        setError(
          "Your account has been disabled. Please contact the administrator for assistance."
        );
        setSnackbarOpen(true);
        return;
      }
      if (userDoc.status && userDoc.status !== "active") {
        setError(
          `Your account status is "${userDoc.status}". Please contact the administrator.`
        );
        setSnackbarOpen(true);
        return;
      }

      // Compare password using bcrypt
      const passwordMatch = await new Promise<boolean>((resolve) => {
        bcrypt.compare(password, userDoc.password, (err, res) => {
          resolve(res === true);
        });
      });

      if (!passwordMatch) {
        setError("Invalid username or password. Please try again.");
        setSnackbarOpen(true);
        return;
      }

      // Store user role and info in localStorage and IndexedDB for offline
      const userInfo = {
        username: userDoc.username,
        firstName: userDoc.firstName || "",
        lastName: userDoc.lastName || "",
        role: userDoc.role,
      };
      localStorage.setItem("role", userDoc.role);
      localStorage.setItem("userInfo", JSON.stringify(userInfo));
      await setLocal("employees", { id: userDoc.id, ...userInfo }); // Store user in offline cache

      if (userDoc.role === "admin") navigate("/admin");
      else if (userDoc.role === "cashier") navigate("/cashier");
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred during login. Please try again.");
      setSnackbarOpen(true);
    } finally {
      setLoading(false); // Always stop loading, regardless of success or failure
    }
  };

  // Handlers for Snackbar and Forgot Password alert
  const handleCloseSnackbar = () => setSnackbarOpen(false);
  const handleCloseForgotPasswordAlert = () => {
    setForgotPasswordAlertOpen(false);
  };

  // Stepper logic for UX (visual indicator of form progress)
  const step = username && password ? 2 : username ? 1 : 0;

  // Handles forgot password click
  const handleForgotPassword = () => {
    setForgotPasswordAlertOpen(true);
  };

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
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Applies base CSS for consistent styling */}
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: isMobile ? "column" : "row", // Stack vertically on mobile
          position: "relative",
          background: "linear-gradient(135deg, #f0f2f5 0%, #e0e0e0 100%)", // Softer, more modern gradient
          overflow: "hidden", // Hide overflow for animated background shapes
          fontFamily: theme.typography.fontFamily,
        }}
      >
        {/* Decorative background shapes with animations */}
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

        {/* Left side - Login Form */}
        <Box
          sx={{
            width: isMobile ? "100%" : "50%", // Full width on mobile, half on desktop
            minHeight: isMobile ? "auto" : "100vh", // Auto height on mobile, full height on desktop
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            px: isXs ? 2 : isMobile ? 4 : 8, // Responsive horizontal padding
            py: isXs ? 4 : isMobile ? 6 : 0, // Responsive vertical padding
            position: "relative",
            zIndex: 2, // Ensure form is above background shapes
            background: isMobile ? "rgba(255,255,255,0.95)" : "transparent", // Solid background on mobile for readability
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
                width: 8, // Slightly wider accent
                borderRadius: 4,
                background: "linear-gradient(180deg, #ef5350 0%, #ffab91 100%)", // Brighter red gradient
                boxShadow: "0 0 20px 5px rgba(239,83,80,0.3)", // More pronounced shadow
                zIndex: 3, // Above other elements
              }}
            />
          )}

          {/* Shop logo and name with entrance animations */}
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
                  height: isXs ? 64 : isMobile ? 80 : 100, // Responsive logo size
                  mb: 2.5,
                  filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.15))", // More pronounced shadow
                  borderRadius: 3,
                  background: "#fff",
                  p: 2, // Increased padding around logo
                }}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Typography
                variant={isXs ? "h5" : "h4"} // Responsive heading size
                sx={{
                  fontWeight: 800,
                  letterSpacing: 1.5, // More letter spacing
                  color: theme.palette.primary.main, // Using theme color
                  mb: 1,
                  textShadow: "0 3px 10px rgba(0,0,0,0.08)", // More subtle text shadow
                }}
              >
                MAD AUTO CARE SERVICES
              </Typography>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: theme.palette.text.secondary, // Using theme color
                  mb: 4, // Increased bottom margin
                  fontWeight: 500,
                  fontSize: isXs ? "1rem" : "1.1rem", // Responsive font size
                }}
              >
                Premium Car Care Solutions
              </Typography>
            </motion.div>
          </motion.div>

          {/* Glassmorphism Card for Login Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            style={{ width: "100%", maxWidth: 400 }} // Adjusted max width for better proportion
          >
            <Paper
              elevation={0} // Custom shadow handled by theme
              sx={{
                width: "100%",
                p: isXs ? 3 : 4, // Increased padding
                borderRadius: 3,
                background: theme.palette.background.paper, // Transparent background from theme
                backdropFilter: 'blur(20px)', // Glassmorphism blur
                boxShadow: '0 20px 60px 0 rgba(0,0,0,0.15), 0 5px 15px 0 rgba(0,0,0,0.05)', // Deeper, softer shadow
                border: '1px solid rgba(255,255,255,0.4)', // Visible border for glass effect
                overflow: "hidden", // Ensure content stays within rounded corners
                position: "relative",
              }}
            >
              {/* Stepper indicator for UX */}
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                {[0, 1].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 32, // Wider
                      height: 8, // Taller
                      borderRadius: 3,
                      mx: 0.8,
                      background:
                        step > i
                          ? "linear-gradient(90deg, #ef5350 0%, #ffab91 100%)" // Brighter red gradient
                          : "#e0e0e0", // Lighter inactive color
                      transition: "background 0.4s ease-in-out",
                    }}
                  />
                ))}
              </Box>

              <Typography
                variant="h6"
                component="h1"
                sx={{
                  mb: 3,
                  textAlign: "center",
                  fontWeight: 700,
                  color: theme.palette.secondary.main, // Darker text for contrast
                  fontFamily: theme.typography.h6.fontFamily,
                  fontSize: isXs ? "1.2rem" : "1.35rem", // Responsive font size
                }}
              >
                Sign in to your account
              </Typography>

              <form onSubmit={handleLogin} autoComplete="off">
                {/* Username Input with animation */}
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
                    sx={{ mb: 2.5 }} // Increased margin bottom
                    required
                    autoFocus
                    size="medium"
                  />
                </motion.div>

                {/* Password Input with animation and visibility toggle */}
                <motion.div variants={itemVariants}>
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? "text" : "password"}
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
                            onClick={() => setShowPassword((v: boolean) => !v)} // Explicitly type 'v' as boolean
                            edge="end"
                            size="small"
                            tabIndex={-1} // Prevent tabbing to this button
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }} // Increased margin bottom
                    required
                    size="medium"
                  />
                </motion.div>

                {/* Forgot Password Link */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2.5 }}>
                  <Link
                    component="button"
                    type="button" // Prevent form submit on click
                    onClick={handleForgotPassword}
                    sx={{
                      fontSize: "0.95rem", // Slightly larger font
                      color: theme.palette.primary.main, // Matching brighter red
                      fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    Forgot password?
                  </Link>
                </Box>

                {/* Sign In Button with hover/tap animations */}
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
                      loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />
                    }
                    sx={{
                      mt: 1.5,
                      py: 1.5, // Increased padding
                      borderRadius: 3, // More rounded
                      fontSize: "1.1rem", // Larger font
                      background: theme.palette.primary.main, // Using theme color
                      '&:hover': {
                        background: theme.palette.primary.dark, // Darker hover state
                        outline: 'none', // Ensure no outline on hover
                        border: 'none', // Explicitly remove border on hover
                      },
                      '&:focus': { // Ensure no outline on focus (for keyboard navigation)
                        outline: 'none',
                        border: 'none', // Explicitly remove border on focus
                      },
                      boxShadow: '0 6px 20px rgba(0,0,0,0.15)', // Initial shadow
                    }}
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </motion.div>

                {/* Success Message (if any, though errors are handled by Snackbar) */}
                {message && (
                  <Fade in={!!message}>
                    <Alert
                      severity="success"
                      sx={{
                        mt: 3,
                        borderRadius: 2,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        fontSize: "0.97rem",
                      }}
                    >
                      {message}
                    </Alert>
                  </Fade>
                )}
              </form>

              {/* Create Account Link */}
              <Box sx={{ mt: 3, textAlign: "center" }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: "0.95rem" }} // Slightly larger font
                >
                  Don't have an account?{" "}
                  <Link
                    component="button"
                    onClick={() => navigate("/register")}
                    sx={{
                      fontWeight: 700,
                      cursor: "pointer",
                      color: theme.palette.primary.main, // Matching brighter red
                      "&:hover": {
                        textDecoration: "underline",
                      },
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    Create Account
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
                  opacity: index === currentImageIndex ? 1 : 0, // Only current image is visible
                  scale: index === currentImageIndex ? 1 : 1.05, // Subtle zoom effect
                  transition: { duration: 1.5, ease: "easeInOut" }, // Slower, smoother transition
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
                  zIndex: 1, // Below overlay
                }}
              />
            ))}
            {/* Overlay gradient for text readability and branding */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background:
                  "linear-gradient(120deg, rgba(0,0,0,0.65) 30%, rgba(239,83,80,0.35) 100%)", // Darker and matching red
                zIndex: 2, // Above images
              }}
            />
            {/* Branding overlay text with entrance animations */}
            <Box
              sx={{
                position: "absolute",
                bottom: 64, // Increased bottom margin
                left: 64, // Increased left margin
                zIndex: 3, // Above overlay
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
                    mb: 1.5,
                    letterSpacing: 1.5,
                    textShadow: "0 4px 16px rgba(0,0,0,0.8)", // More distinct shadow
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
                  sx={{ fontWeight: 500, textShadow: "0 2px 10px rgba(0,0,0,0.6)" }} // More distinct shadow
                >
                  Premium Car Care Solutions
                </Typography>
              </motion.div>
            </Box>
            {/* Carousel dots for navigation */}
            <Box
              sx={{
                position: "absolute",
                bottom: 40, // Adjusted position
                left: 64, // Adjusted position
                zIndex: 4, // Above branding
                display: "flex",
                gap: 1.5, // More space between dots
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
                      width: 16, // Larger dots
                      height: 16,
                      borderRadius: "50%",
                      background: idx === currentImageIndex ? "#fff" : "rgba(255,255,255,0.6)",
                      border:
                        idx === currentImageIndex
                          ? "3px solid #ef5350" // Matching brighter red border
                          : "2px solid rgba(255,255,255,0.4)",
                      transition: "all 0.3s ease-in-out",
                      cursor: "pointer",
                    }}
                    onClick={() => setCurrentImageIndex(idx)} // Allow clicking dots to change image
                  />
                </motion.div>
              ))}
            </Box>
          </Box>
        )}

        {/* Snackbar for errors (animates in/out) */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={5000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          sx={{ mt: { xs: 2, sm: 8 } }} // Responsive top margin
        >
          <motion.div
            initial={{ opacity: 0, y: -50 }}
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
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.error.main,
                "& .MuiAlert-icon": {
                  color: theme.palette.error.main,
                },
              }}
            >
              {error}
            </Alert>
          </motion.div>
        </Snackbar>

        {/* Snackbar for forgot password alert (animates in/out) */}
        {forgotPasswordAlertOpen && (
          <Snackbar
            open={forgotPasswordAlertOpen}
            autoHideDuration={6000}
            onClose={handleCloseForgotPasswordAlert}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
            sx={{ mt: { xs: 2, sm: 8 } }} // Responsive top margin
          >
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Alert
                severity="info"
                onClose={handleCloseForgotPasswordAlert}
                sx={{
                  width: "100%",
                  borderRadius: 2,
                  boxShadow: 3,
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.info.main,
                  "& .MuiAlert-icon": {
                    color: theme.palette.info.main,
                  },
                }}
              >
                Please contact the administrator to change your password.
              </Alert>
            </motion.div>
          </Snackbar>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default LoginForm;
