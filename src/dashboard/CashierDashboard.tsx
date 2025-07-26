import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Card,
  CardContent,
  Stack,
  Tooltip,
  Skeleton,
  useTheme,
  useMediaQuery,
  Button,
  createTheme, // Import createTheme for consistency
  ThemeProvider, // Import ThemeProvider
  CssBaseline,
  CircularProgress, // Import CssBaseline
  LinearProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar"; // Assuming this path is correct
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase"; // Assuming this path is correct
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import GroupIcon from "@mui/icons-material/Group";
import RefreshIcon from "@mui/icons-material/Refresh";
import { motion } from "framer-motion"; // Import motion for animations
import { getAllLocal, onSyncStatus } from "../utils/offlineSync";

// Custom Material-UI Theme for consistent styling (copied from LoginForm/RegistrationForm)
const theme = createTheme({
  typography: {
    fontFamily: '"Inter", sans-serif', // Using Inter as requested
    h3: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 800,
      letterSpacing: 1.5,
    },
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
    subtitle1: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 500,
    },
    body1: {
      fontFamily: '"Inter", sans-serif',
    },
    body2: {
      fontFamily: '"Inter", sans-serif',
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
    success: {
      main: '#4CAF50', // Green
      light: '#81C784',
      dark: '#2E7D32',
    },
    info: {
      main: '#2196F3', // Blue
      light: '#64B5F6',
      dark: '#1976D2',
    },
    warning: {
      main: '#FFC107', // Amber/Yellow
      light: '#FFD54F',
      dark: '#FF8F00',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '24px', // Consistent rounded corners for main paper elements
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)', // Consistent softer shadow
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px', // Slightly less rounded for cards
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)', // Consistent softer shadow
          transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)', // Smooth transition for hover
          '&:hover': {
            boxShadow: '0 12px 35px rgba(0,0,0,0.15)', // More pronounced shadow on hover
            transform: 'translateY(-5px)', // Subtle lift effect
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '16px', // Consistent rounded corners for buttons
          textTransform: 'none',
          fontWeight: 700,
          letterSpacing: 0.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '12px', // Rounded chips
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  },
});

interface CashierDashboardProps {
  onLogout?: () => void;
  onProfile?: () => void;
}

interface PaymentRecord {
  id?: string;
  customerName: string;
  carName: string;
  plateNumber: string;
  variety: string;
  serviceId: string;
  serviceName: string;
  price: number;
  cashier: string;
  cashierFullName?: string;
  employees: { id: string; name: string; commission: number }[];
  referrer?: { id: string; name: string; commission: number };
  createdAt: number;
  paid?: boolean;
  paymentMethod?: string;
  amountTendered?: number;
  change?: number;
}

interface LoyaltyCustomer {
  id?: string;
  name: string;
  cars: { carName: string; plateNumber: string }[];
  points?: number;
}

const peso = (v: number) => `₱${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const CashierDashboard: React.FC<CashierDashboardProps> = ({ onLogout, onProfile }) => {
  const navigate = useNavigate();
  const currentTheme = useTheme(); // Use currentTheme to avoid conflict with imported 'theme'
  const isSm = useMediaQuery(currentTheme.breakpoints.down("sm"));
  const isMd = useMediaQuery(currentTheme.breakpoints.down("md"));

  // State for dashboard stats
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loyaltyCustomers, setLoyaltyCustomers] = useState<LoyaltyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Fetch payments and loyalty customers (offline + online)
  const fetchData = async () => {
    setLoading(true);
    try {
      // Firestore
      const [paymentsSnap, loyaltySnap] = await Promise.all([
        getDocs(collection(db, "payments")),
        getDocs(collection(db, "loyalty_customers")),
      ]);
      const firestorePayments = paymentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as PaymentRecord[];
      const firestoreLoyalty = loyaltySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as LoyaltyCustomer[];

      // Local offline
      let localPayments: PaymentRecord[] = [];
      let localLoyalty: LoyaltyCustomer[] = [];
      try {
        localPayments = (await getAllLocal("payments")) as PaymentRecord[] || [];
        localLoyalty = (await getAllLocal("loyalty_customers")) as LoyaltyCustomer[] || [];
      } catch {}

      // Merge payments
      const mergedPayments: PaymentRecord[] = [...firestorePayments];
      for (const local of localPayments) {
        const match = firestorePayments.find(f =>
          f.customerName === local.customerName &&
          f.carName === local.carName &&
          f.plateNumber === local.plateNumber &&
          f.createdAt === local.createdAt &&
          f.price === local.price
        );
        if (!match) mergedPayments.push(local);
      }

      // Merge loyalty customers
      const mergedLoyalty: LoyaltyCustomer[] = [...firestoreLoyalty];
      for (const local of localLoyalty) {
        const match = firestoreLoyalty.find(f =>
          f.name === local.name &&
          JSON.stringify(f.cars) === JSON.stringify(local.cars)
        );
        if (!match) mergedLoyalty.push(local);
      }

      setPayments(mergedPayments);
      setLoyaltyCustomers(mergedLoyalty);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for global offline sync events
  useEffect(() => {
    const handler = (status: "start" | "end") => setSyncingOffline(status === "start");
    onSyncStatus(handler);
    return () => {};
  }, []);

  // Compute today's stats
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

  const todaysPayments = payments.filter((p) => p.createdAt >= startOfDay && p.createdAt <= endOfDay);

  const todaysPaid = todaysPayments.filter((p) => p.paid);
  const todaysUnpaid = todaysPayments.filter((p) => !p.paid);

  const todaySales = todaysPaid.reduce((sum, p) => sum + (typeof p.price === "number" ? p.price : 0), 0);

  // Most availed services (top 3)
  const serviceCount: { [serviceName: string]: number } = {};
  todaysPayments.forEach((p) => {
    if (p.serviceName) {
      serviceCount[p.serviceName] = (serviceCount[p.serviceName] || 0) + 1;
    }
  });
  const mostAvailed = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Total loyalty customers
  const totalLoyaltyCustomers = loyaltyCustomers.length;

  // All-time stats
  const allPaid = payments.filter((p) => p.paid);
  const allUnpaid = payments.filter((p) => !p.paid);
  const allSales = allPaid.reduce((sum, p) => sum + (typeof p.price === "number" ? p.price : 0), 0);

  // All-time most availed services (top 3)
  const allServiceCount: { [serviceName: string]: number } = {};
  payments.forEach((p) => {
    if (p.serviceName) {
      allServiceCount[p.serviceName] = (allServiceCount[p.serviceName] || 0) + 1;
    }
  });
  const allMostAvailed = Object.entries(allServiceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Ensure onProfile and onLogout work with navigation
  const handleProfile = () => {
    if (onProfile) onProfile();
    navigate("/profile");
  };
  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    navigate("/login");
  };

  // Skeleton loader for cards - improved to mimic content structure
  const StatCardSkeleton = () => (
    <Card
      elevation={4}
      sx={{
        flex: "1 1 220px",
        minWidth: 220,
        borderRadius: 3,
        bgcolor: "background.paper",
        p: 2, // Add padding to skeleton card
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width="70%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width="85%" height={28} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width="55%" height={16} />
        </Box>
      </CardContent>
    </Card>
  );

  // Framer Motion variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppSidebar role="cashier" onLogout={handleLogoutClick} onProfile={handleProfile}>
        <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 1400, mx: "auto", width: "100%" }}>
          {/* Show syncing offline data message */}
          {syncingOffline && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress color="info" />
              <Typography color="info.main" sx={{ mt: 1, fontWeight: 600 }}>
                Syncing offline data to Firebase...
              </Typography>
            </Box>
          )}

          {/* Header Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
          >
            <Paper
              elevation={4} // Increased elevation for a more prominent header
              sx={{
                p: { xs: 2.5, sm: 4 }, // Increased padding for more breathing room
                mb: 4, // Increased margin bottom
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                borderRadius: 4, // More rounded corners
                boxShadow: currentTheme.shadows[6], // Stronger shadow
                background: `linear-gradient(135deg, ${currentTheme.palette.primary.light} 0%, ${currentTheme.palette.primary.main} 100%)`, // Vibrant gradient
                color: currentTheme.palette.primary.contrastText, // White text for contrast
              }}
            >
              <Box>
                <Typography variant={isSm ? "h5" : "h3"} fontWeight={700} gutterBottom>
                  Cashier Dashboard
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Welcome, Cashier! Here is your summary for today and all time.
                </Typography>
              </Box>
              <Tooltip title="Refresh Data">
                <Button
                  onClick={fetchData}
                  variant="contained" // Contained button for refresh
                  color="secondary" // Secondary color for refresh button
                  sx={{
                    borderRadius: 2.5, // More rounded
                    fontWeight: 600,
                    minWidth: 120, // Wider button
                    px: 3, // More horizontal padding
                    py: 1.5, // More vertical padding
                    alignSelf: { xs: "flex-end", sm: "center" },
                    boxShadow: currentTheme.shadows[3], // Subtle shadow
                    "&:hover": {
                      boxShadow: currentTheme.shadows[6], // Elevate on hover
                      transform: "translateY(-2px)", // Subtle lift on hover
                    },
                  }}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                  disabled={loading} // Disable refresh button while loading
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </Button>
              </Tooltip>
            </Paper>
          </motion.div>

          {/* Dashboard Stats as Flex Cards */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{
              display: "grid", // Use CSS Grid for better control
              gridTemplateColumns: isMd ? "repeat(auto-fit, minmax(220px, 1fr))" : "repeat(auto-fit, minmax(250px, 1fr))", // Responsive columns on small and up
              gap: currentTheme.spacing(3), // Use theme spacing
              marginBottom: currentTheme.spacing(4), // Increased margin bottom
              justifyContent: "center", // Center items horizontally
            }}
          >
            {/* Today's Sales */}
            {loading ? (
              <StatCardSkeleton />
            ) : (
              <motion.div variants={itemVariants}>
                <Card
                  elevation={4}
                  sx={{
                    borderLeft: `6px solid ${currentTheme.palette.success.main}`, // Thicker border
                    borderRadius: 3,
                    bgcolor: "background.paper",
                  }}
                >
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 3 }}>
                    <MonetizationOnIcon color="success" sx={{ fontSize: 40 }} /> {/* Larger icon */}
                    <Box>
                      <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>
                        Today's Sales
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color={currentTheme.palette.success.dark}>
                        {peso(todaySales)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        All Time: <span style={{ fontWeight: 600 }}>{peso(allSales)}</span>
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Paid Services */}
            {loading ? (
              <StatCardSkeleton />
            ) : (
              <motion.div variants={itemVariants}>
                <Card
                  elevation={4}
                  sx={{
                    borderLeft: `6px solid ${currentTheme.palette.info.main}`, // Changed to info color
                    borderRadius: 3,
                    bgcolor: "background.paper",
                  }}
                >
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 3 }}>
                    <CheckCircleIcon color="info" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>
                        Paid Services
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color={currentTheme.palette.info.dark}>
                        {todaysPaid.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        All Time: <span style={{ fontWeight: 600 }}>{allPaid.length}</span>
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Unpaid Services */}
            {loading ? (
              <StatCardSkeleton />
            ) : (
              <motion.div variants={itemVariants}>
                <Card
                  elevation={4}
                  sx={{
                    borderLeft: `6px solid ${currentTheme.palette.warning.main}`,
                    borderRadius: 3,
                    bgcolor: "background.paper",
                  }}
                >
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 3 }}>
                    <HourglassEmptyIcon color="warning" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>
                        Unpaid Services
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color={currentTheme.palette.warning.dark}>
                        {todaysUnpaid.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        All Time: <span style={{ fontWeight: 600 }}>{allUnpaid.length}</span>
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Loyalty Customers */}
            {loading ? (
              <StatCardSkeleton />
            ) : (
              <motion.div variants={itemVariants}>
                <Card
                  elevation={4}
                  sx={{
                    borderLeft: `6px solid ${currentTheme.palette.primary.main}`, // Changed to primary color
                    borderRadius: 3,
                    bgcolor: "background.paper",
                  }}
                >
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 3 }}>
                    <GroupIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>
                        Loyalty Customers
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color={currentTheme.palette.primary.dark}>
                        {totalLoyaltyCustomers}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Registered
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Most Availed Services Today */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
          >
            <Paper elevation={4} sx={{ mb: 4, borderRadius: 3, p: { xs: 2.5, sm: 3.5 }, bgcolor: "background.paper" }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                <EmojiEventsIcon color="warning" sx={{ mr: 1.5, fontSize: 28 }} /> {/* Larger icon */}
                Most Availed Services Today
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Stack direction={isSm ? "column" : "row"} spacing={2} sx={{ width: "100%" }}>
                  <Skeleton variant="rectangular" width={isSm ? "100%" : 180} height={40} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" width={isSm ? "100%" : 180} height={40} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" width={isSm ? "100%" : 180} height={40} sx={{ borderRadius: 2 }} />
                </Stack>
              ) : mostAvailed.length === 0 ? (
                <Typography color="text.secondary" variant="body1">
                  No services availed today.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: isSm ? "center" : "flex-start" }}>
                  {mostAvailed.map(([service, count], idx) => (
                    <Chip
                      key={service}
                      label={`${service} (${count})`}
                      color={idx === 0 ? "warning" : idx === 1 ? "info" : "default"}
                      icon={<EmojiEventsIcon />}
                      sx={{
                        fontWeight: 600,
                        fontSize: isSm ? 14 : 16,
                        px: isSm ? 1.5 : 2,
                        py: isSm ? 0.5 : 1,
                        borderRadius: 2, // More rounded chips
                        boxShadow: currentTheme.shadows[1], // Subtle shadow for chips
                      }}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          </motion.div>

          {/* Most Availed Services (All Time) */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
          >
            <Paper elevation={4} sx={{ mb: 4, borderRadius: 3, p: { xs: 2.5, sm: 3.5 }, bgcolor: "background.paper" }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                <EmojiEventsIcon color="primary" sx={{ mr: 1.5, fontSize: 28 }} /> {/* Larger icon */}
                Most Availed Services (All Time)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Stack direction={isSm ? "column" : "row"} spacing={2} sx={{ width: "100%" }}>
                  <Skeleton variant="rectangular" width={isSm ? "100%" : 180} height={40} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" width={isSm ? "100%" : 180} height={40} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" width={isSm ? "100%" : 180} height={40} sx={{ borderRadius: 2 }} />
                </Stack>
              ) : allMostAvailed.length === 0 ? (
                <Typography color="text.secondary" variant="body1">
                  No services availed yet.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: isSm ? "center" : "flex-start" }}>
                  {allMostAvailed.map(([service, count], idx) => (
                    <Chip
                      key={service}
                      label={`${service} (${count})`}
                      color={idx === 0 ? "primary" : idx === 1 ? "info" : "default"}
                      icon={<EmojiEventsIcon />}
                      sx={{
                        fontWeight: 600,
                        fontSize: isSm ? 14 : 16,
                        px: isSm ? 1.5 : 2,
                        py: isSm ? 0.5 : 1,
                        borderRadius: 2,
                        boxShadow: currentTheme.shadows[1],
                      }}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          </motion.div>
        </Box>
      </AppSidebar>
    </ThemeProvider>
  );
};

export default CashierDashboard;
